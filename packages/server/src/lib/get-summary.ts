import { db } from "@/db";
import { bookmark } from "@/db/schema";
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

  const bookmarkData = {
    ...existingBookmark,
    title:
      existingBookmark?.title ?? scrapeResponse.metadata?.title ?? "Untitled",
    description:
      existingBookmark?.description ??
      scrapeResponse.metadata?.description ??
      null,
    faviconUrl:
      existingBookmark?.faviconUrl ??
      String(scrapeResponse.metadata?.favicon) ??
      null,
    ogImageUrl:
      existingBookmark?.ogImageUrl ?? scrapeResponse.metadata?.ogImage ?? null,
    summary: scrapeResponse.summary ?? null,
  };

  console.log("Updating bookmark summary:");
  console.log(bookmarkData);

  const updatedBookmark = await db
    .update(bookmark)
    .set(bookmarkData)
    .where(eq(bookmark.id, bookmarkId));

  return updatedBookmark;
};
