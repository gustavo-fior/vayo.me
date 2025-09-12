import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers/index";
import { auth } from "./lib/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import { folder } from "./db/schema/folder";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/api");
app.use(logger());
app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    endpoint: "/api/trpc",
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  })
);

app.get("/getFolderById", async (c) => {
  const folderId = c.req.query("folderId");

  if (!folderId) {
    return c.json({ error: "Folder ID is required" }, 400);
  }

  const foundFolder = await db.query.folder.findFirst({
    where: and(eq(folder.id, folderId), eq(folder.isShared, true)),
  });

  if (!foundFolder) {
    return c.json({ error: "Folder not found" }, 404);
  }

  return c.json(foundFolder);
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
export type AppType = typeof app;
export const handler = handle(app);
