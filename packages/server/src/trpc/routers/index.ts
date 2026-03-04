import { router } from "../trpc";
import { foldersRouter } from "./folders";
import { bookmarksRouter } from "./bookmarks";
import { canvasAssetsRouter } from "./canvas-assets";

export const appRouter = router({
  folders: foldersRouter,
  bookmarks: bookmarksRouter,
  canvasAssets: canvasAssetsRouter,
});

export type AppRouter = typeof appRouter;
