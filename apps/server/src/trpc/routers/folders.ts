import { db } from "@/db";
import { folder } from "@/db/schema/folder";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { v7 as uuidv7 } from "uuid";

export const foldersRouter = router({
  getFolders: protectedProcedure.query(({ ctx }) => {
    return db
      .select()
      .from(folder)
      .where(eq(folder.userId, ctx.session.user.id))
      .orderBy(asc(folder.createdAt));
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
  createFolder: protectedProcedure
    .input(z.object({ name: z.string(), icon: z.string().optional() }))
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
