import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { relations } from "drizzle-orm";
import { bookmark } from "./bookmark";
import { canvasAsset } from "./canvas-asset";

export const folderTypeEnum = pgEnum("folder_type", ["bookmarks", "canvas"]);

export const folder = pgTable("folder", {
  id: text("id").primaryKey().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  name: text("name").notNull(),
  icon: text("icon"),
  isShared: boolean("is_shared").notNull().default(false),
  type: folderTypeEnum("type").notNull().default("bookmarks"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const folderRelations = relations(folder, ({ one, many }) => ({
  bookmarks: many(bookmark),
  canvasAssets: many(canvasAsset),
  user: one(user, {
    fields: [folder.userId],
    references: [user.id],
  }),
}));
