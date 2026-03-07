import { db } from "@/db";
import { canvasAsset, folder } from "@/db/schema";
import { getSupabase } from "@/lib/supabase";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const PAGE_SIZE = 50;

export const canvasAssetsRouter = router({
  getAssetsByFolderId: protectedProcedure
    .input(z.object({ folderId: z.string(), page: z.number() }))
    .query(({ input }) => {
      return db
        .select()
        .from(canvasAsset)
        .where(eq(canvasAsset.folderId, input.folderId))
        .orderBy(asc(canvasAsset.sortOrder), asc(canvasAsset.createdAt))
        .limit(PAGE_SIZE)
        .offset((input.page - 1) * PAGE_SIZE);
    }),

  getPublicCanvasAssets: publicProcedure
    .input(z.object({ folderId: z.string(), page: z.number() }))
    .query(async ({ input }) => {
      const folderIsShared = await db.query.folder.findFirst({
        where: and(eq(folder.id, input.folderId), eq(folder.isShared, true)),
      });

      if (!folderIsShared) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return db
        .select()
        .from(canvasAsset)
        .where(eq(canvasAsset.folderId, input.folderId))
        .orderBy(asc(canvasAsset.sortOrder), asc(canvasAsset.createdAt))
        .limit(PAGE_SIZE)
        .offset((input.page - 1) * PAGE_SIZE);
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
      // Validate folder ownership
      const foundFolder = await db.query.folder.findFirst({
        where: and(
          eq(folder.id, input.folderId),
          eq(folder.userId, ctx.session.user.id),
          eq(folder.type, "canvas")
        ),
      });

      if (!foundFolder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Canvas folder not found",
        });
      }

      // Get max sort order and z-index for this folder
      const existing = await db
        .select({ sortOrder: canvasAsset.sortOrder, canvasZIndex: canvasAsset.canvasZIndex })
        .from(canvasAsset)
        .where(eq(canvasAsset.folderId, input.folderId))
        .orderBy(asc(canvasAsset.sortOrder));

      const nextSortOrder =
        existing.length > 0
          ? existing[0].sortOrder - 1
          : 0;

      const nextZIndex =
        existing.length > 0
          ? Math.max(...existing.map((e) => e.canvasZIndex)) + 1
          : 0;

      const result = await db
        .insert(canvasAsset)
        .values({
          id: uuidv7(),
          url: input.url,
          assetType: input.assetType,
          mimeType: input.mimeType ?? null,
          fileSize: input.fileSize ?? null,
          width: input.width ?? null,
          height: input.height ?? null,
          originalFilename: input.originalFilename ?? null,
          sortOrder: nextSortOrder,
          canvasZIndex: nextZIndex,
          folderId: input.folderId,
        })
        .returning();

      // Update folder updatedAt
      await db
        .update(folder)
        .set({ updatedAt: new Date() })
        .where(eq(folder.id, input.folderId));

      return result[0];
    }),

  updateAssetPosition: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        canvasX: z.number(),
        canvasY: z.number(),
        canvasWidth: z.number(),
        canvasHeight: z.number(),
      })
    )
    .mutation(({ input }) => {
      return db
        .update(canvasAsset)
        .set({
          canvasX: input.canvasX,
          canvasY: input.canvasY,
          canvasWidth: input.canvasWidth,
          canvasHeight: input.canvasHeight,
          updatedAt: new Date(),
        })
        .where(eq(canvasAsset.id, input.id));
    }),

  batchUpdatePositions: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.string(),
          canvasX: z.number(),
          canvasY: z.number(),
          canvasWidth: z.number(),
          canvasHeight: z.number(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const updates = input.map((item) =>
        db
          .update(canvasAsset)
          .set({
            canvasX: item.canvasX,
            canvasY: item.canvasY,
            canvasWidth: item.canvasWidth,
            canvasHeight: item.canvasHeight,
            updatedAt: new Date(),
          })
          .where(eq(canvasAsset.id, item.id))
      );
      await Promise.all(updates);
    }),

  updateSortOrder: protectedProcedure
    .input(z.array(z.object({ id: z.string(), sortOrder: z.number() })))
    .mutation(async ({ input }) => {
      const updates = input.map((item) =>
        db
          .update(canvasAsset)
          .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
          .where(eq(canvasAsset.id, item.id))
      );
      await Promise.all(updates);
    }),

  updateZIndex: protectedProcedure
    .input(z.array(z.object({ id: z.string(), canvasZIndex: z.number() })))
    .mutation(async ({ input }) => {
      const updates = input.map((item) =>
        db
          .update(canvasAsset)
          .set({ canvasZIndex: item.canvasZIndex, updatedAt: new Date() })
          .where(eq(canvasAsset.id, item.id))
      );
      await Promise.all(updates);
    }),

  moveAssetToFolder: protectedProcedure
    .input(z.object({ assetId: z.string(), folderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const targetFolder = await db.query.folder.findFirst({
        where: and(
          eq(folder.id, input.folderId),
          eq(folder.userId, ctx.session.user.id),
          eq(folder.type, "canvas")
        ),
      });

      if (!targetFolder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Canvas folder not found",
        });
      }

      const asset = await db.query.canvasAsset.findFirst({
        where: eq(canvasAsset.id, input.assetId),
      });

      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      await db
        .update(canvasAsset)
        .set({ folderId: input.folderId, updatedAt: new Date() })
        .where(eq(canvasAsset.id, input.assetId));

      // Update both folders' updatedAt
      await Promise.all([
        db.update(folder).set({ updatedAt: new Date() }).where(eq(folder.id, asset.folderId)),
        db.update(folder).set({ updatedAt: new Date() }).where(eq(folder.id, input.folderId)),
      ]);
    }),

  deleteAsset: protectedProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      // Get the asset to find its storage path
      const asset = await db.query.canvasAsset.findFirst({
        where: eq(canvasAsset.id, input),
      });

      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      // Try to delete from Supabase Storage if it's a storage URL
      const supabaseUrl = process.env.SUPABASE_URL || "";
      if (asset.url.includes(supabaseUrl)) {
        // Extract storage path from the public URL
        const pathMatch = asset.url.split("/canvas-assets/")[1];
        if (pathMatch) {
          await getSupabase().storage.from("canvas-assets").remove([pathMatch]);
        }
      }

      await db.delete(canvasAsset).where(eq(canvasAsset.id, input));

      // Update folder updatedAt
      await db
        .update(folder)
        .set({ updatedAt: new Date() })
        .where(eq(folder.id, asset.folderId));
    }),
});
