import { db } from "@/db";
import { folder, item } from "@/db/schema";
import { updateLinkSummary } from "@/lib/get-summary";
import { getR2, getR2Bucket } from "@/lib/r2";
import { getUrlMetadata } from "@/lib/url-metadata";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const PAGE_SIZE = 50;

const paginatedItemsInput = z.object({
  folderId: z.string(),
  page: z.number(),
  view: z.enum(["list", "grid"]),
});

const canvasLayoutInput = z.object({
  id: z.string(),
  canvasX: z.number(),
  canvasY: z.number(),
  canvasWidth: z.number(),
  canvasHeight: z.number(),
});

function getAssetFallbackTitle(url: string, assetType: "image" | "video") {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").filter(Boolean).pop();
    if (filename) {
      return decodeURIComponent(filename);
    }
  } catch {
    // Fall through to the generic label.
  }

  return assetType === "image" ? "Untitled image" : "Untitled video";
}

async function getNextPlacement(folderId: string) {
  const existing = await db
    .select({
      gridSortOrder: item.gridSortOrder,
      canvasZIndex: item.canvasZIndex,
    })
    .from(item)
    .where(eq(item.folderId, folderId))
    .orderBy(asc(item.gridSortOrder));

  return {
    nextGridSortOrder:
      existing.length > 0 ? existing[0].gridSortOrder - 1 : 0,
    nextCanvasZIndex:
      existing.length > 0
        ? Math.max(...existing.map((entry) => entry.canvasZIndex)) + 1
        : 0,
  };
}

async function ensureOwnedFolder(folderId: string, userId: string) {
  const foundFolder = await db.query.folder.findFirst({
    where: and(eq(folder.id, folderId), eq(folder.userId, userId)),
  });

  if (!foundFolder) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
  }

  return foundFolder;
}

async function ensureSharedFolder(folderId: string) {
  const foundFolder = await db.query.folder.findFirst({
    where: and(eq(folder.id, folderId), eq(folder.isShared, true)),
  });

  if (!foundFolder) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
  }

  return foundFolder;
}

async function touchFolder(folderId: string) {
  await db
    .update(folder)
    .set({ updatedAt: new Date() })
    .where(eq(folder.id, folderId));
}

async function ensureOwnedItems(itemIds: string[], userId: string) {
  const uniqueItemIds = Array.from(new Set(itemIds));
  if (uniqueItemIds.length === 0) {
    return;
  }

  const foundItems = await db
    .select({
      id: item.id,
      folderId: item.folderId,
    })
    .from(item)
    .where(inArray(item.id, uniqueItemIds));

  if (foundItems.length !== uniqueItemIds.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
  }

  const folderIds = Array.from(new Set(foundItems.map((entry) => entry.folderId)));
  await Promise.all(folderIds.map((folderId) => ensureOwnedFolder(folderId, userId)));
}

export const itemsRouter = router({
  getItemsByFolderId: protectedProcedure
    .input(paginatedItemsInput)
    .query(async ({ input, ctx }) => {
      await ensureOwnedFolder(input.folderId, ctx.session.user.id);

      const baseQuery = db
        .select()
        .from(item)
        .where(eq(item.folderId, input.folderId));

      return (input.view === "list"
        ? baseQuery.orderBy(desc(item.createdAt))
        : baseQuery.orderBy(asc(item.gridSortOrder), desc(item.createdAt))
      )
        .limit(PAGE_SIZE)
        .offset((input.page - 1) * PAGE_SIZE);
    }),

  getPublicItemsByFolderId: publicProcedure
    .input(paginatedItemsInput)
    .query(async ({ input }) => {
      await ensureSharedFolder(input.folderId);

      const baseQuery = db
        .select()
        .from(item)
        .where(eq(item.folderId, input.folderId));

      return (input.view === "list"
        ? baseQuery.orderBy(desc(item.createdAt))
        : baseQuery.orderBy(asc(item.gridSortOrder), desc(item.createdAt))
      )
        .limit(PAGE_SIZE)
        .offset((input.page - 1) * PAGE_SIZE);
    }),

  getCanvasItemsByFolderId: protectedProcedure
    .input(z.object({ folderId: z.string() }))
    .query(async ({ input, ctx }) => {
      await ensureOwnedFolder(input.folderId, ctx.session.user.id);

      return db
        .select()
        .from(item)
        .where(eq(item.folderId, input.folderId))
        .orderBy(asc(item.canvasZIndex), desc(item.createdAt));
    }),

  getPublicCanvasItemsByFolderId: publicProcedure
    .input(z.object({ folderId: z.string() }))
    .query(async ({ input }) => {
      await ensureSharedFolder(input.folderId);

      return db
        .select()
        .from(item)
        .where(eq(item.folderId, input.folderId))
        .orderBy(asc(item.canvasZIndex), desc(item.createdAt));
    }),

  createLink: protectedProcedure
    .input(
      z.object({
        url: z.string(),
        folderId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureOwnedFolder(input.folderId, ctx.session.user.id);

      const [metadata, placement] = await Promise.all([
        getUrlMetadata(input.url),
        getNextPlacement(input.folderId),
      ]);

      const itemId = uuidv7();
      const [createdItem] = await db
        .insert(item)
        .values({
          id: itemId,
          folderId: input.folderId,
          type: "link",
          title: metadata.title ?? "Untitled",
          url: input.url,
          description: metadata.description ?? null,
          faviconUrl: metadata.faviconUrl ?? null,
          ogImageUrl: metadata.ogImageUrl ?? null,
          gridSortOrder: placement.nextGridSortOrder,
          canvasZIndex: placement.nextCanvasZIndex,
        })
        .returning();

      await touchFolder(input.folderId);
      void updateLinkSummary(itemId, input.url);

      return createdItem;
    }),

  createColor: protectedProcedure
    .input(
      z.object({
        color: z.string(),
        title: z.string().optional(),
        folderId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureOwnedFolder(input.folderId, ctx.session.user.id);
      const placement = await getNextPlacement(input.folderId);

      const [createdItem] = await db
        .insert(item)
        .values({
          id: uuidv7(),
          folderId: input.folderId,
          type: "color",
          title: input.title ?? input.color,
          color: input.color,
          gridSortOrder: placement.nextGridSortOrder,
          canvasZIndex: placement.nextCanvasZIndex,
        })
        .returning();

      await touchFolder(input.folderId);

      return createdItem;
    }),

  createAsset: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        url: z.string(),
        assetType: z.enum(["image", "video"]),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        originalFilename: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureOwnedFolder(input.folderId, ctx.session.user.id);
      const placement = await getNextPlacement(input.folderId);

      const [createdItem] = await db
        .insert(item)
        .values({
          id: uuidv7(),
          folderId: input.folderId,
          type: input.assetType,
          title:
            input.originalFilename?.trim() ||
            getAssetFallbackTitle(input.url, input.assetType),
          url: input.url,
          mimeType: input.mimeType ?? null,
          fileSize: input.fileSize ?? null,
          width: input.width ?? null,
          height: input.height ?? null,
          originalFilename: input.originalFilename ?? null,
          gridSortOrder: placement.nextGridSortOrder,
          canvasZIndex: placement.nextCanvasZIndex,
        })
        .returning();

      await touchFolder(input.folderId);

      return createdItem;
    }),

  updateTitle: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const foundItem = await db.query.item.findFirst({
        where: eq(item.id, input.id),
      });

      if (!foundItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      await ensureOwnedFolder(foundItem.folderId, ctx.session.user.id);

      return db
        .update(item)
        .set({ title: input.title, updatedAt: new Date() })
        .where(eq(item.id, input.id))
        .returning();
    }),

  moveItemToFolder: protectedProcedure
    .input(z.object({ itemId: z.string(), folderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [foundItem] = await Promise.all([
        db.query.item.findFirst({
          where: eq(item.id, input.itemId),
        }),
        ensureOwnedFolder(input.folderId, ctx.session.user.id),
      ]);

      if (!foundItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      await ensureOwnedFolder(foundItem.folderId, ctx.session.user.id);

      const placement = await getNextPlacement(input.folderId);

      await db
        .update(item)
        .set({
          folderId: input.folderId,
          gridSortOrder: placement.nextGridSortOrder,
          canvasX: null,
          canvasY: null,
          canvasWidth: null,
          canvasHeight: null,
          canvasZIndex: placement.nextCanvasZIndex,
          updatedAt: new Date(),
        })
        .where(eq(item.id, input.itemId));

      await Promise.all([
        touchFolder(foundItem.folderId),
        touchFolder(input.folderId),
      ]);
    }),

  deleteItem: protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const foundItem = await db.query.item.findFirst({
        where: eq(item.id, input),
      });

      if (!foundItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      await ensureOwnedFolder(foundItem.folderId, ctx.session.user.id);

      const r2PublicUrl = process.env.R2_PUBLIC_URL || "";
      if (
        (foundItem.type === "image" || foundItem.type === "video") &&
        foundItem.url &&
        r2PublicUrl &&
        foundItem.url.startsWith(r2PublicUrl)
      ) {
        const key = foundItem.url.slice(r2PublicUrl.length + 1);
        await getR2().send(
          new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
        );
      }

      await db.delete(item).where(eq(item.id, input));
      await touchFolder(foundItem.folderId);
    }),

  updateGridSortOrder: protectedProcedure
    .input(z.array(z.object({ id: z.string(), gridSortOrder: z.number() })))
    .mutation(async ({ input, ctx }) => {
      await ensureOwnedItems(
        input.map((entry) => entry.id),
        ctx.session.user.id
      );

      await Promise.all(
        input.map((entry) =>
          db
            .update(item)
            .set({
              gridSortOrder: entry.gridSortOrder,
              updatedAt: new Date(),
            })
            .where(eq(item.id, entry.id))
        )
      );
    }),

  updateCanvasLayout: protectedProcedure
    .input(canvasLayoutInput)
    .mutation(async ({ input, ctx }) => {
      await ensureOwnedItems([input.id], ctx.session.user.id);

      return db
        .update(item)
        .set({
          canvasX: input.canvasX,
          canvasY: input.canvasY,
          canvasWidth: input.canvasWidth,
          canvasHeight: input.canvasHeight,
          updatedAt: new Date(),
        })
        .where(eq(item.id, input.id));
    }),

  batchUpdateCanvasLayout: protectedProcedure
    .input(z.array(canvasLayoutInput))
    .mutation(async ({ input, ctx }) => {
      await ensureOwnedItems(
        input.map((entry) => entry.id),
        ctx.session.user.id
      );

      await Promise.all(
        input.map((entry) =>
          db
            .update(item)
            .set({
              canvasX: entry.canvasX,
              canvasY: entry.canvasY,
              canvasWidth: entry.canvasWidth,
              canvasHeight: entry.canvasHeight,
              updatedAt: new Date(),
            })
            .where(eq(item.id, entry.id))
        )
      );
    }),

  updateCanvasZIndex: protectedProcedure
    .input(z.array(z.object({ id: z.string(), canvasZIndex: z.number() })))
    .mutation(async ({ input, ctx }) => {
      await ensureOwnedItems(
        input.map((entry) => entry.id),
        ctx.session.user.id
      );

      await Promise.all(
        input.map((entry) =>
          db
            .update(item)
            .set({
              canvasZIndex: entry.canvasZIndex,
              updatedAt: new Date(),
            })
            .where(eq(item.id, entry.id))
        )
      );
    }),
});
