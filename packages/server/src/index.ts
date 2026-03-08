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
import { getSupabase } from "./lib/supabase";
import { v7 as uuidv7 } from "uuid";

const app = new Hono().basePath("/api");
app.use(logger());
app.use(
  "/*",
  cors({
    origin: (origin) => {
      const allowed = (process.env.CORS_ORIGIN || "").split(",");
      if (origin.startsWith("chrome-extension://")) return origin;
      return allowed.includes(origin) ? origin : allowed[0] || "";
    },
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

app.post("/upload", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  const folderId = body["folderId"] as string;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "File is required" }, 400);
  }

  if (!folderId) {
    return c.json({ error: "folderId is required" }, 400);
  }

  // Validate folder ownership and type
  const foundFolder = await db.query.folder.findFirst({
    where: and(
      eq(folder.id, folderId),
      eq(folder.userId, session.user.id),
      eq(folder.type, "canvas")
    ),
  });

  if (!foundFolder) {
    return c.json({ error: "Canvas folder not found" }, 404);
  }

  // Validate file type
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return c.json({ error: "Only image and video files are allowed" }, 400);
  }

  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `${session.user.id}/${folderId}/${uuidv7()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await getSupabase().storage
    .from("canvas-assets")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return c.json({ error: "Failed to upload file" }, 500);
  }

  const {
    data: { publicUrl },
  } = getSupabase().storage.from("canvas-assets").getPublicUrl(storagePath);

  return c.json({
    url: publicUrl,
    mimeType: file.type,
    fileSize: file.size,
    originalFilename: file.name,
    storagePath,
  });
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
export type AppType = typeof app;
export const handler = handle(app);
