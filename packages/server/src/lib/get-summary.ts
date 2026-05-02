import { db } from "@/db";
import { item } from "@/db/schema";
import { mergeBookmarkMetadata } from "@/lib/url-metadata";
import Firecrawl from "@mendable/firecrawl-js";
import { eq } from "drizzle-orm";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

export const updateLinkSummary = async (itemId: string, url: string) => {
  const existingItem = await db.query.item.findFirst({
    where: eq(item.id, itemId),
  });

  if (!existingItem || existingItem.type !== "link") {
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
      title: existingItem.title,
      description: existingItem.description,
      faviconUrl: existingItem.faviconUrl,
      ogImageUrl: existingItem.ogImageUrl,
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

  const itemData = {
    title: mergedMetadata.title ?? existingItem.title ?? "Untitled",
    description: mergedMetadata.description,
    faviconUrl: mergedMetadata.faviconUrl,
    ogImageUrl: mergedMetadata.ogImageUrl,
    summary: scrapeResponse.summary ?? existingItem.summary ?? null,
    updatedAt: new Date(),
  };

  console.log("Updating link summary:");
  console.log(itemData);

  const updatedItem = await db
    .update(item)
    .set(itemData)
    .where(eq(item.id, itemId));

  return updatedItem;
};

export const updateBookmarkSummary = updateLinkSummary;
