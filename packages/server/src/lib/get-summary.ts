import { db } from "@/db";
import { bookmark } from "@/db/schema";
import { mergeBookmarkMetadata } from "@/lib/url-metadata";
import Firecrawl from "@mendable/firecrawl-js";
import { eq } from "drizzle-orm";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

export const updateBookmarkSummary = async (
  bookmarkId: string,
  url: string
) => {
  const existingBookmark = await db.query.bookmark.findFirst({
    where: eq(bookmark.id, bookmarkId),
  });

  if (!existingBookmark) {
    return null;
  }

  console.log(`[${new Date().toISOString()}] Starting Firecrawl scrape...`);
  const scrapeStartTime = Date.now();

  const scrapeResponse = await firecrawl.scrape(url, {
    formats: ["summary"],
  });

  const scrapeEndTime = Date.now();
  console.log(
    `[${new Date().toISOString()}] Firecrawl scrape completed in ${
      scrapeEndTime - scrapeStartTime
    }ms`
  );

  console.log(scrapeResponse);

  const mergedMetadata = mergeBookmarkMetadata(
    url,
    {
      title: existingBookmark.title,
      description: existingBookmark.description,
      faviconUrl: existingBookmark.faviconUrl,
      ogImageUrl: existingBookmark.ogImageUrl,
    },
    {
      title:
        typeof scrapeResponse.metadata?.title === "string"
          ? scrapeResponse.metadata.title
          : null,
      description:
        typeof scrapeResponse.metadata?.description === "string"
          ? scrapeResponse.metadata.description
          : null,
      faviconUrl:
        typeof scrapeResponse.metadata?.favicon === "string"
          ? scrapeResponse.metadata.favicon
          : null,
      ogImageUrl:
        typeof scrapeResponse.metadata?.ogImage === "string"
          ? scrapeResponse.metadata.ogImage
          : null,
    }
  );

  const bookmarkData = {
    title: mergedMetadata.title ?? existingBookmark.title ?? "Untitled",
    description: mergedMetadata.description,
    faviconUrl: mergedMetadata.faviconUrl,
    ogImageUrl: mergedMetadata.ogImageUrl,
    summary: scrapeResponse.summary ?? existingBookmark.summary ?? null,
    updatedAt: new Date(),
  };

  console.log("Updating bookmark summary:");
  console.log(bookmarkData);

  const updatedBookmark = await db
    .update(bookmark)
    .set(bookmarkData)
    .where(eq(bookmark.id, bookmarkId));

  return updatedBookmark;
};
