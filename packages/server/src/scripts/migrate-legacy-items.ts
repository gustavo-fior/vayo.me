import "dotenv/config";
import { db } from "@/db";
import { bookmark, canvasAsset, folder, item } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

type ItemInsert = typeof item.$inferInsert;

type LegacyCount = {
  folderId: string;
  folderName: string;
  bookmarkCount: number;
  assetCount: number;
  totalLegacyItems: number;
};

type MigrationMode = "dry-run" | "execute";

function getMode(): MigrationMode {
  return process.argv.includes("--dry-run") ? "dry-run" : "execute";
}

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

async function getLegacyCounts(): Promise<LegacyCount[]> {
  const [folders, bookmarks, assets] = await Promise.all([
    db.query.folder.findMany(),
    db.query.bookmark.findMany(),
    db.query.canvasAsset.findMany(),
  ]);

  return folders.map((currentFolder) => {
    const bookmarkCount = bookmarks.filter(
      (currentBookmark) => currentBookmark.folderId === currentFolder.id
    ).length;
    const assetCount = assets.filter(
      (currentAsset) => currentAsset.folderId === currentFolder.id
    ).length;

    return {
      folderId: currentFolder.id,
      folderName: currentFolder.name,
      bookmarkCount,
      assetCount,
      totalLegacyItems: bookmarkCount + assetCount,
    };
  });
}

async function main() {
  const mode = getMode();
  const legacyCounts = await getLegacyCounts();
  const [bookmarks, assets, folders] = await Promise.all([
    db.query.bookmark.findMany({
      orderBy: desc(bookmark.createdAt),
    }),
    db.query.canvasAsset.findMany({
      orderBy: desc(canvasAsset.createdAt),
    }),
    db.query.folder.findMany(),
  ]);

  const duplicateIds = bookmarks
    .map((currentBookmark) => currentBookmark.id)
    .filter((bookmarkId) =>
      assets.some((currentAsset) => currentAsset.id === bookmarkId)
    );

  if (duplicateIds.length > 0) {
    throw new Error(
      `Duplicate IDs found between bookmark and canvas_asset tables: ${duplicateIds.join(", ")}`
    );
  }

  const existingItems = await db.query.item.findMany();
  if (existingItems.length > 0) {
    throw new Error(
      "The item table already contains data. Refusing to run migration on a non-empty target."
    );
  }

  const folderBookmarkRanks = new Map<string, Map<string, number>>();
  const bookmarksByFolder = new Map<string, typeof bookmarks>();
  for (const currentBookmark of bookmarks) {
    const existingFolderBookmarks =
      bookmarksByFolder.get(currentBookmark.folderId) ?? [];
    existingFolderBookmarks.push(currentBookmark);
    bookmarksByFolder.set(currentBookmark.folderId, existingFolderBookmarks);
  }

  for (const [folderId, folderBookmarks] of bookmarksByFolder.entries()) {
    folderBookmarkRanks.set(
      folderId,
      new Map(
        folderBookmarks.map((currentBookmark, index) => [
          currentBookmark.id,
          index,
        ])
      )
    );
  }

  const migratedBookmarks: ItemInsert[] = bookmarks.map((currentBookmark, index) => {
    const gridSortOrder =
      folderBookmarkRanks
        .get(currentBookmark.folderId)
        ?.get(currentBookmark.id) ?? 0;

    return {
      id: currentBookmark.id,
      createdAt: currentBookmark.createdAt,
      updatedAt: currentBookmark.updatedAt,
      type: currentBookmark.type === "color" ? "color" : "link",
      title: currentBookmark.title,
      url: currentBookmark.url,
      color: currentBookmark.color,
      faviconUrl: currentBookmark.faviconUrl,
      ogImageUrl: currentBookmark.ogImageUrl,
      description: currentBookmark.description,
      summary: currentBookmark.summary,
      mimeType: null,
      fileSize: null,
      width: null,
      height: null,
      originalFilename: null,
      gridSortOrder,
      canvasX: null,
      canvasY: null,
      canvasWidth: null,
      canvasHeight: null,
      canvasZIndex: index,
      folderId: currentBookmark.folderId,
    };
  });

  const migratedAssets: ItemInsert[] = assets.map((currentAsset) => ({
    id: currentAsset.id,
    createdAt: currentAsset.createdAt,
    updatedAt: currentAsset.updatedAt,
    type: currentAsset.assetType,
    title:
      currentAsset.originalFilename ||
      getAssetFallbackTitle(currentAsset.url, currentAsset.assetType),
    url: currentAsset.url,
    color: null,
    faviconUrl: null,
    ogImageUrl: null,
    description: null,
    summary: null,
    mimeType: currentAsset.mimeType,
    fileSize: currentAsset.fileSize,
    width: currentAsset.width,
    height: currentAsset.height,
    originalFilename: currentAsset.originalFilename,
    gridSortOrder: currentAsset.sortOrder,
    canvasX: currentAsset.canvasX,
    canvasY: currentAsset.canvasY,
    canvasWidth: currentAsset.canvasWidth,
    canvasHeight: currentAsset.canvasHeight,
    canvasZIndex: currentAsset.canvasZIndex,
    folderId: currentAsset.folderId,
  }));

  const allMigratedItems = [...migratedBookmarks, ...migratedAssets];
  const migratedCounts = folders.map((currentFolder) => {
    const totalMigratedItems = allMigratedItems.filter(
      (entry) => entry.folderId === currentFolder.id
    ).length;
    const legacy = legacyCounts.find((entry) => entry.folderId === currentFolder.id);

    return {
      folderId: currentFolder.id,
      folderName: currentFolder.name,
      totalLegacyItems: legacy?.totalLegacyItems ?? 0,
      totalMigratedItems,
      targetDefaultView: currentFolder.type === "canvas" ? "grid" : "list",
    };
  });

  console.log(`Migration mode: ${mode}`);
  console.table(
    migratedCounts.map((entry) => ({
      folderId: entry.folderId,
      folderName: entry.folderName,
      legacy: entry.totalLegacyItems,
      migrated: entry.totalMigratedItems,
      defaultView: entry.targetDefaultView,
    }))
  );

  const totalLegacy = migratedCounts.reduce(
    (sum, entry) => sum + entry.totalLegacyItems,
    0
  );
  const totalMigrated = migratedCounts.reduce(
    (sum, entry) => sum + entry.totalMigratedItems,
    0
  );

  console.log(`Total legacy items: ${totalLegacy}`);
  console.log(`Total migrated items: ${totalMigrated}`);

  const hasMismatch = migratedCounts.some(
    (entry) => entry.totalLegacyItems !== entry.totalMigratedItems
  );

  if (hasMismatch || totalLegacy !== totalMigrated) {
    throw new Error("Count mismatch detected before writing migration data.");
  }

  if (mode === "dry-run") {
    console.log("Dry run complete. No data was written.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx.insert(item).values(allMigratedItems);

    await Promise.all(
      folders.map((currentFolder) =>
        tx
          .update(folder)
          .set({
            defaultView: currentFolder.type === "canvas" ? "grid" : "list",
          })
          .where(eq(folder.id, currentFolder.id))
      )
    );

    const insertedItems = await tx.query.item.findMany();
    const insertedCounts = folders.map((currentFolder) => ({
      folderId: currentFolder.id,
      totalItems: insertedItems.filter(
        (entry) => entry.folderId === currentFolder.id
      ).length,
    }));

    const countMismatch = migratedCounts.some((entry) => {
      const inserted = insertedCounts.find(
        (insertedEntry) => insertedEntry.folderId === entry.folderId
      );

      return inserted?.totalItems !== entry.totalLegacyItems;
    });

    if (countMismatch) {
      throw new Error("Inserted item counts do not match legacy counts.");
    }
  });

  console.log("Migration completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
