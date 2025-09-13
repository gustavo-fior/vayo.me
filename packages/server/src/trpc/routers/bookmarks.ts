import { db } from "@/db";
import { bookmark, folder } from "@/db/schema";
import { updateBookmarkSummary } from "@/lib/get-summary";
import { getUrlMetadata } from "@/lib/url-metadata";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

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
      const startTime = Date.now();
      console.log(
        `[${new Date().toISOString()}] Starting bookmark creation for URL: ${
          input.url
        }`
      );

      console.log(
        `[${new Date().toISOString()}] Starting URL metadata scrape...`
      );
      const metadataStartTime = Date.now();
      const metadata = await getUrlMetadata(input.url);
      console.log(metadata);

      console.log(
        `[${new Date().toISOString()}] URL metadata scrape completed in ${
          Date.now() - metadataStartTime
        }ms`
      );

      console.log(`[${new Date().toISOString()}] Starting folder update...`);
      const folderUpdateStartTime = Date.now();
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
      const folderUpdateEndTime = Date.now();
      console.log(
        `[${new Date().toISOString()}] Folder update completed in ${
          folderUpdateEndTime - folderUpdateStartTime
        }ms`
      );

      if (!updatedFolder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      console.log(`[${new Date().toISOString()}] Processing bookmark data...`);

      const bookmarkId = uuidv7();

      const bookmarkData = {
        ...input,
        id: bookmarkId,
        title: metadata?.title ?? "Untitled",
        description: metadata?.description ?? null,
        faviconUrl: metadata?.favicons?.[0]?.href
          ? new URL(metadata.favicons[0].href, input.url).toString()
          : null,
        ogImageUrl: metadata?.["og:image"] ?? null,
      };
      console.log(`[${new Date().toISOString()}] Bookmark data processed`);

      try {
        console.log(
          `[${new Date().toISOString()}] Starting bookmark insert...`
        );
        const insertStartTime = Date.now();
        const result = await db.insert(bookmark).values(bookmarkData);
        const insertEndTime = Date.now();
        console.log(
          `[${new Date().toISOString()}] Bookmark insert completed in ${
            insertEndTime - insertStartTime
          }ms`
        );

        const totalTime = Date.now() - startTime;
        console.log(
          `[${new Date().toISOString()}] Total bookmark creation time: ${totalTime}ms`
        );

        void updateBookmarkSummary(bookmarkId, input.url);

        return result;
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Error during bookmark insert:`,
          error
        );
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
