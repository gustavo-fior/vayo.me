import { router } from "../trpc";
import { foldersRouter } from "./folders";
import { bookmarksRouter } from "./bookmarks";

export const appRouter = router({
  folders: foldersRouter,
  bookmarks: bookmarksRouter,
});

export type AppRouter = typeof appRouter;
