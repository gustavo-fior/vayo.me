import {
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { folder } from "./folder";
import { relations } from "drizzle-orm";

export const assetTypeEnum = pgEnum("asset_type", ["image", "video"]);

export const canvasAsset = pgTable(
  "canvas_asset",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    url: text("url").notNull(),
    assetType: assetTypeEnum("asset_type").notNull(),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    width: integer("width"),
    height: integer("height"),
    originalFilename: text("original_filename"),
    canvasX: real("canvas_x"),
    canvasY: real("canvas_y"),
    canvasWidth: real("canvas_width"),
    canvasHeight: real("canvas_height"),
    sortOrder: integer("sort_order").notNull().default(0),
    canvasZIndex: integer("canvas_z_index").notNull().default(0),
    folderId: text("folder_id")
      .notNull()
      .references(() => folder.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_canvas_asset_folder_sort").on(table.folderId, table.sortOrder),
  ]
);

export const canvasAssetRelations = relations(canvasAsset, ({ one }) => ({
  folder: one(folder, {
    fields: [canvasAsset.folderId],
    references: [folder.id],
  }),
}));
