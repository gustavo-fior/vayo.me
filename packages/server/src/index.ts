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
import { v7 as uuidv7 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, getR2PublicUrl, getR2Bucket } from "./lib/r2";

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

app.post("/upload-url", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { folderId, fileName, contentType } = await c.req.json();

  if (!folderId || !fileName || !contentType) {
    return c.json({ error: "folderId, fileName, and contentType are required" }, 400);
  }

  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return c.json({ error: "Only image and video files are allowed" }, 400);
  }

  const foundFolder = await db.query.folder.findFirst({
    where: and(eq(folder.id, folderId), eq(folder.userId, session.user.id)),
  });

  if (!foundFolder) {
    return c.json({ error: "Folder not found" }, 404);
  }

  const ext = fileName.split(".").pop() || "bin";
  const storagePath = `${session.user.id}/${folderId}/${uuidv7()}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: storagePath,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(getR2(), command, { expiresIn: 3600 });
    const publicUrl = getR2PublicUrl(storagePath);

    return c.json({
      signedUrl,
      storagePath,
      publicUrl,
    });
  } catch (err) {
    console.error("Signed URL error:", err);
    return c.json({ error: "Failed to create upload URL" }, 500);
  }
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
export type AppType = typeof app;
export const handler = handle(app);
