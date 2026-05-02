import {
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { folder } from "./folder";

export const itemTypeEnum = pgEnum("item_type", [
  "link",
  "color",
  "image",
  "video",
]);

export const item = pgTable(
  "item",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    type: itemTypeEnum("type").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    color: text("color"),
    faviconUrl: text("favicon_url"),
    ogImageUrl: text("og_image_url"),
    description: text("description"),
    summary: text("summary"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    width: integer("width"),
    height: integer("height"),
    originalFilename: text("original_filename"),
    gridSortOrder: integer("grid_sort_order").notNull().default(0),
    canvasX: real("canvas_x"),
    canvasY: real("canvas_y"),
    canvasWidth: real("canvas_width"),
    canvasHeight: real("canvas_height"),
    canvasZIndex: integer("canvas_z_index").notNull().default(0),
    folderId: text("folder_id")
      .notNull()
      .references(() => folder.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_item_folder_created_at").on(table.folderId, table.createdAt),
    index("idx_item_folder_grid_sort").on(table.folderId, table.gridSortOrder),
    index("idx_item_folder_canvas_z").on(table.folderId, table.canvasZIndex),
  ]
);

export const itemRelations = relations(item, ({ one }) => ({
  folder: one(folder, {
    fields: [item.folderId],
    references: [folder.id],
  }),
}));
