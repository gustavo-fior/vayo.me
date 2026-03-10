import { db } from "@/db";
import { folder } from "@/db/schema/folder";
import { bookmark } from "@/db/schema/bookmark";
import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { v7 as uuidv7 } from "uuid";
import { canvasAsset } from "@/db/schema/canvas-asset";

export const foldersRouter = router({
  getFolders: protectedProcedure.query(async ({ ctx }) => {
    const folders = await db
      .select({
        id: folder.id,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        name: folder.name,
        icon: folder.icon,
        isShared: folder.isShared,
        type: folder.type,
        userId: folder.userId,
        totalBookmarks: count(bookmark.id),
        totalCanvasAssets: count(canvasAsset.id),
      })
      .from(folder)
      .leftJoin(bookmark, eq(folder.id, bookmark.folderId))
      .leftJoin(canvasAsset, eq(folder.id, canvasAsset.folderId))
      .where(eq(folder.userId, ctx.session.user.id))
      .groupBy(
        folder.id,
        folder.createdAt,
        folder.updatedAt,
        folder.name,
        folder.icon,
        folder.isShared,
        folder.type,
        folder.userId
      )
      .orderBy(asc(folder.createdAt));

    return folders.map((folder) => ({
      ...folder,
      totalItems: folder.totalBookmarks + folder.totalCanvasAssets,
    }));
  }),
  getFolderById: protectedProcedure
    .input(z.string())
    .query(({ input, ctx }) => {
      return db.query.folder.findFirst({
        where: and(
          eq(folder.id, input),
          eq(folder.userId, ctx.session.user.id)
        ),
      });
    }),
  getPublicFolderById: publicProcedure.input(z.string()).query(({ input }) => {
    return db.query.folder.findFirst({
      where: and(eq(folder.id, input), eq(folder.isShared, true)),
    });
  }),
  createFolder: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        icon: z.string().optional(),
        type: z.enum(["bookmarks", "canvas"]).optional().default("bookmarks"),
      })
    )
    .mutation(({ input, ctx }) => {
      return db
        .insert(folder)
        .values({ ...input, userId: ctx.session.user.id, id: uuidv7() })
        .returning();
    }),
  updateFolderVisibility: protectedProcedure
    .input(z.object({ id: z.string(), isShared: z.boolean() }))
    .mutation(({ input, ctx }) => {
      return db
        .update(folder)
        .set({ isShared: input.isShared, updatedAt: new Date() })
        .where(
          and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id))
        );
    }),
  updateFolder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      return db
        .update(folder)
        .set({ name: input.name, icon: input.icon ?? null, updatedAt: new Date() })
        .where(
          and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id))
        )
        .returning();
    }),
  deleteFolder: protectedProcedure
    .input(z.string())
    .mutation(({ input, ctx }) => {
      return db
        .delete(folder)
        .where(
          and(eq(folder.id, input), eq(folder.userId, ctx.session.user.id))
        );
    }),
});
