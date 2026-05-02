import { router } from "../trpc";
import { foldersRouter } from "./folders";
import { itemsRouter } from "./items";

export const appRouter = router({
  folders: foldersRouter,
  items: itemsRouter,
});

export type AppRouter = typeof appRouter;
