import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { folder } from "./folder";
import { relations } from "drizzle-orm";

export const bookmark = pgTable(
  "bookmark",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    url: text("url").notNull(),
    faviconUrl: text("favicon_url"),
    ogImageUrl: text("og_image_url"),
    description: text("description"),
    summary: text("summary"),
    title: text("title").notNull(),
    folderId: text("folder_id")
      .notNull()
      .references(() => folder.id, { onDelete: "cascade" }),
  },
  // indexes
  (table) => [
    index("idx_folder_id_created_at").on(table.folderId, table.createdAt),
    index("idx_title").on(table.title),
    index("idx_url").on(table.url),
  ]
);

export const bookmarkRelations = relations(bookmark, ({ one }) => ({
  folder: one(folder, {
    fields: [bookmark.folderId],
    references: [folder.id],
  }),
}));
