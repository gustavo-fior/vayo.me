import { protectedProcedure, router } from "../trpc";
import { db } from "@/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Firecrawl from "@mendable/firecrawl-js";
import { bookmark } from "@/db/schema";
import { folder } from "@/db/schema";
import { v7 as uuidv7 } from "uuid";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

const PAGE_SIZE = 30;

export type Bookmark = typeof bookmark.$inferSelect;

export const bookmarksRouter = router({
  getBookmarksByFolderId: protectedProcedure
    .input(z.object({ folderId: z.string(), page: z.number() }))
    .query(({ input }) => {
      return db
        .select({
          id: bookmark.id,
          title: bookmark.title,
          description: bookmark.description,
          faviconUrl: bookmark.faviconUrl,
          ogImageUrl: bookmark.ogImageUrl,
          createdAt: bookmark.createdAt,
          updatedAt: bookmark.updatedAt,
          folderId: bookmark.folderId,
          url: bookmark.url,
        })
        .from(bookmark)
        .where(eq(bookmark.folderId, input.folderId))
        .orderBy(desc(bookmark.createdAt))
        .limit(PAGE_SIZE)
        .offset((input.page - 1) * PAGE_SIZE);
    }),
  getBookmarksFromSharedFolderId: protectedProcedure
    .input(z.object({ folderId: z.string(), page: z.number() }))
    .query(async ({ input }) => {
      const folderIsShared = await db.query.folder.findFirst({
        where: eq(folder.id, input.folderId),
      });

      if (!folderIsShared || !folderIsShared.isShared) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return db
        .select({
          id: bookmark.id,
          title: bookmark.title,
          description: bookmark.description,
          faviconUrl: bookmark.faviconUrl,
          ogImageUrl: bookmark.ogImageUrl,
          createdAt: bookmark.createdAt,
          updatedAt: bookmark.updatedAt,
          folderId: bookmark.folderId,
          url: bookmark.url,
        })
        .from(bookmark)
        .where(eq(bookmark.folderId, input.folderId))
        .orderBy(desc(bookmark.createdAt))
        .limit(PAGE_SIZE)
        .offset((input.page - 1) * PAGE_SIZE);
    }),
  createBookmark: protectedProcedure
    .input(
      z.object({
        url: z.string(),
        folderId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const scrapeResponse = await firecrawl.scrape(input.url, {
        formats: ["markdown", "summary"],
      });

      const updatedFolder = await db
        .update(folder)
        .set({ updatedAt: new Date() })
        .where(
          and(
            eq(folder.id, input.folderId),
            eq(folder.userId, ctx.session.user.id)
          )
        )
        .returning();

      if (!updatedFolder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      const bookmarkData = {
        ...input,
        id: uuidv7(),
        title: scrapeResponse.metadata?.title ?? "Untitled",
        description: scrapeResponse.metadata?.description ?? null,
        faviconUrl: String(scrapeResponse.metadata?.favicon) ?? null,
        ogImageUrl: scrapeResponse.metadata?.ogImage ?? null,
        summary: scrapeResponse.summary ?? null,
      };

      try {
        return db.insert(bookmark).values(bookmarkData);
      } catch (error) {
        console.error(error);
        return null;
      }
    }),
  updateTitle: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // update the folder updatedAt
      const updatedFolder = await db
        .update(folder)
        .set({ updatedAt: new Date() })
        .where(
          and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id))
        )
        .returning();

      if (!updatedFolder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return db
        .update(bookmark)
        .set({ title: input.title, updatedAt: new Date() })
        .where(eq(bookmark.id, input.id));
    }),
  moveBookmarkToFolder: protectedProcedure
    .input(z.object({ bookmarkId: z.string(), folderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const updatedFolder = await db
        .update(folder)
        .set({ updatedAt: new Date() })
        .where(
          and(
            eq(folder.id, input.folderId),
            eq(folder.userId, ctx.session.user.id)
          )
        );

      if (!updatedFolder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      const updatedBookmark = await db
        .update(bookmark)
        .set({ folderId: input.folderId, updatedAt: new Date() })
        .where(eq(bookmark.id, input.bookmarkId));

      if (!updatedBookmark) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bookmark not found",
        });
      }

      return updatedBookmark;
    }),
  deleteBookmark: protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      // update the folder updatedAt
      const updatedFolder = await db
        .update(folder)
        .set({ updatedAt: new Date() })
        .where(
          and(eq(folder.id, input), eq(folder.userId, ctx.session.user.id))
        );

      if (!updatedFolder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return db.delete(bookmark).where(eq(bookmark.id, input));
    }),
});
