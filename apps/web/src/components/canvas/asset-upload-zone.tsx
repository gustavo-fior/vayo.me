"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Upload, ArrowUpIcon, CircleXIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { isEditableElement } from "@/utils/is-editable-element";
import type { ItemRecord } from "@/types/items";
import {
  canvasItemsQueryKey,
  gridItemsQueryKey,
  listItemsQueryKey,
} from "@/utils/item-query-keys";

function buildTempItem({
  id,
  folderId,
  url,
  type,
  mimeType,
  fileSize,
  originalFilename,
}: {
  id: string;
  folderId: string;
  url: string;
  type: "image" | "video";
  mimeType?: string | null;
  fileSize?: number | null;
  originalFilename?: string | null;
}): ItemRecord {
  const now = new Date().toISOString();

  return {
    id,
    _temp: true,
    folderId,
    createdAt: now,
    updatedAt: now,
    type,
    title:
      originalFilename ||
      (type === "image" ? "Untitled image" : "Untitled video"),
    url,
    color: null,
    faviconUrl: null,
    ogImageUrl: null,
    description: null,
    summary: null,
    mimeType: mimeType ?? null,
    fileSize: fileSize ?? null,
    width: null,
    height: null,
    originalFilename: originalFilename ?? null,
    gridSortOrder: -1,
    canvasX: null,
    canvasY: null,
    canvasWidth: null,
    canvasHeight: null,
    canvasZIndex: 0,
  };
}

function updateInfiniteItemsCache(
  queryKey: readonly unknown[],
  updater: (items: any[]) => any[]
) {
  queryClient.setQueryData(queryKey, (old: any) => {
    if (!old) {
      return {
        pages: [updater([])],
        pageParams: [1],
      };
    }

    return {
      ...old,
      pages: old.pages.map((page: any[], index: number) =>
        index === 0 ? updater(page) : page
      ),
    };
  });
}

function insertTempItem(folderId: string, tempItem: ItemRecord) {
  updateInfiniteItemsCache(listItemsQueryKey(folderId), (items) => [
    tempItem,
    ...items,
  ]);
  updateInfiniteItemsCache(gridItemsQueryKey(folderId), (items) => [
    tempItem,
    ...items,
  ]);
  queryClient.setQueryData(canvasItemsQueryKey(folderId), (old: any) => {
    if (!old) {
      return [tempItem];
    }

    return [tempItem, ...old];
  });
}

function replaceTempItem(
  folderId: string,
  tempId: string,
  nextItem: ItemRecord
) {
  updateInfiniteItemsCache(listItemsQueryKey(folderId), (items) =>
    items.map((item) => (item.id === tempId ? nextItem : item))
  );
  updateInfiniteItemsCache(gridItemsQueryKey(folderId), (items) =>
    items.map((item) => (item.id === tempId ? nextItem : item))
  );
  queryClient.setQueryData(canvasItemsQueryKey(folderId), (old: any) =>
    Array.isArray(old)
      ? old.map((item: any) => (item.id === tempId ? nextItem : item))
      : old
  );
}

function removeTempItem(folderId: string, tempId: string) {
  updateInfiniteItemsCache(listItemsQueryKey(folderId), (items) =>
    items.filter((item) => item.id !== tempId)
  );
  updateInfiniteItemsCache(gridItemsQueryKey(folderId), (items) =>
    items.filter((item) => item.id !== tempId)
  );
  queryClient.setQueryData(canvasItemsQueryKey(folderId), (old: any) =>
    Array.isArray(old) ? old.filter((item: any) => item.id !== tempId) : old
  );
}

export function AssetUploadZone({
  folderId,
  floating = false,
}: {
  folderId: string;
  floating?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isInvalidUrl, setIsInvalidUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const createAsset = useMutation(
    trpc.items.createAsset.mutationOptions({
      onError: () => {
        toast.error("Failed to create item");
      },
    })
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error("Only image and video files are allowed");
        return;
      }

      const assetType = file.type.startsWith("video/")
        ? ("video" as const)
        : ("image" as const);
      const previewUrl = URL.createObjectURL(file);
      const tempId = crypto.randomUUID();
      const tempItem = buildTempItem({
        id: tempId,
        folderId,
        url: previewUrl,
        type: assetType,
        mimeType: file.type,
        fileSize: file.size,
        originalFilename: file.name,
      });

      insertTempItem(folderId, tempItem);

      try {
        const urlRes = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/upload-url`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              folderId,
              fileName: file.name,
              contentType: file.type,
            }),
          }
        );

        if (!urlRes.ok) {
          const err = await urlRes.json();
          throw new Error(err.error || "Failed to get upload URL");
        }

        const { signedUrl, publicUrl } = await urlRes.json();
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Upload to storage failed");
        }

        createAsset.mutate(
          {
            folderId,
            url: publicUrl,
            assetType,
            mimeType: file.type,
            fileSize: file.size,
            originalFilename: file.name,
          },
          {
            onSuccess: (newItem) => {
              replaceTempItem(folderId, tempId, newItem as ItemRecord);
              void Promise.all([
                queryClient.invalidateQueries({
                  queryKey: listItemsQueryKey(folderId),
                }),
                queryClient.invalidateQueries({
                  queryKey: gridItemsQueryKey(folderId),
                }),
                queryClient.invalidateQueries({
                  queryKey: canvasItemsQueryKey(folderId),
                }),
                queryClient.invalidateQueries({
                  queryKey: ["folders", "getFolders"],
                }),
              ]);
            },
            onError: () => {
              removeTempItem(folderId, tempId);
            },
          }
        );
      } catch (error: any) {
        toast.error(error.message || "Failed to upload file");
        removeTempItem(folderId, tempId);
      }
    },
    [createAsset, folderId]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach((file) => uploadFile(file));
    },
    [uploadFile]
  );

  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      event.dataTransfer?.types?.includes("Files") ?? false;

    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };

    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) {
        dragCounterRef.current = 0;
        setIsDragging(false);
        return;
      }

      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        handleFiles(event.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleFiles]);

  const doSubmitUrl = useCallback(
    (url: string, assetType: "image" | "video") => {
      const tempId = crypto.randomUUID();
      const tempItem = buildTempItem({
        id: tempId,
        folderId,
        url,
        type: assetType,
      });

      insertTempItem(folderId, tempItem);

      createAsset.mutate(
        { folderId, url, assetType },
        {
          onSuccess: (newItem) => {
            replaceTempItem(folderId, tempId, newItem as ItemRecord);
            setUrlInput("");
            void Promise.all([
              queryClient.invalidateQueries({
                queryKey: listItemsQueryKey(folderId),
              }),
              queryClient.invalidateQueries({
                queryKey: gridItemsQueryKey(folderId),
              }),
              queryClient.invalidateQueries({
                queryKey: canvasItemsQueryKey(folderId),
              }),
              queryClient.invalidateQueries({
                queryKey: ["folders", "getFolders"],
              }),
            ]);
          },
          onError: () => {
            removeTempItem(folderId, tempId);
          },
        }
      );
    },
    [createAsset, folderId]
  );

  const showInvalidUrlError = useCallback((message: string) => {
    setIsInvalidUrl(true);
    setTimeout(() => setIsInvalidUrl(false), 2000);
    toast.custom(
      () => (
        <div className="flex justify-center mx-auto">
          <div className="bg-popover text-popover-foreground border border-input rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5 shadow-lg">
            <CircleXIcon
              className="size-3.5 text-destructive"
              strokeWidth={2.2}
            />
            <h1>{message}</h1>
          </div>
        </div>
      ),
      { position: "top-center" }
    );
  }, []);

  const submitUrl = useCallback(
    (rawUrl: string) => {
      const url = rawUrl.trim();
      if (!url) return;

      try {
        new URL(url);
      } catch {
        showInvalidUrlError("Please enter a valid URL");
        return;
      }

      const videoExts = [".mp4", ".webm", ".mov", ".ogg"];
      const imageExts = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".bmp",
        ".ico",
        ".avif",
      ];
      const urlPath = url.toLowerCase().split("?")[0];
      const isVideo = videoExts.some((ext) => urlPath.endsWith(ext));
      const isImage = imageExts.some((ext) => urlPath.endsWith(ext));

      if (!isVideo && !isImage) {
        const image = new window.Image();
        image.onload = () => {
          doSubmitUrl(url, "image");
        };
        image.onerror = () => {
          const video = document.createElement("video");
          video.onloadedmetadata = () => {
            doSubmitUrl(url, "video");
          };
          video.onerror = () => {
            showInvalidUrlError("URL does not point to a valid image or video");
          };
          video.src = url;
        };
        image.src = url;
        setUrlInput("");
        return;
      }

      doSubmitUrl(url, isVideo ? "video" : "image");
    },
    [doSubmitUrl, showInvalidUrlError]
  );

  const handleUrlSubmit = useCallback(() => {
    submitUrl(urlInput);
  }, [submitUrl, urlInput]);

  useEffect(() => {
    const handleWindowPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || isEditableElement(event.target)) {
        return;
      }

      const pastedText = event.clipboardData?.getData("text")?.trim();
      if (!pastedText) {
        return;
      }

      try {
        new URL(pastedText);
      } catch {
        return;
      }

      const urlPath = pastedText.toLowerCase().split("?")[0];
      const isLikelyMediaUrl = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".bmp",
        ".ico",
        ".avif",
        ".mp4",
        ".webm",
        ".mov",
        ".ogg",
      ].some((extension) => urlPath.endsWith(extension));

      if (!isLikelyMediaUrl) {
        return;
      }

      event.preventDefault();
      submitUrl(pastedText);
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [submitUrl]);

  return (
    <>
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col items-center gap-1">
              <div className="mb-3 rounded-full bg-primary/10 p-5">
                <Upload className="size-6 text-primary" />
              </div>
              <p className="text-lg font-medium">Drop files to upload</p>
              <p className="text-sm text-muted-foreground">
                Images and videos only
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            handleFiles(event.target.files);
            event.target.value = "";
          }
        }}
      />

      {floating && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2, ease: "easeInOut", delay: 1 }}
          className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4"
        >
          <div className="flex bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-[4px] rounded-lg border border-border shadow-lg">
            <div className="relative flex-1">
              <Input
                placeholder="Paste image/video link"
                value={urlInput}
                style={{ boxShadow: "none" }}
                className={cn(
                  "rounded-sm border-transparent h-10 dark:border-transparent focus-visible:border-transparent focus-visible:ring-0 bg-transparent text-primary placeholder:text-primary/50",
                  isInvalidUrl &&
                    "animate-shake placeholder:text-destructive dark:placeholder:text-destructive text-destructive dark:text-destructive selection:bg-destructive/20 dark:selection:bg-destructive/20 selection:text-destructive dark:selection:text-destructive"
                )}
                onChange={(event) => setUrlInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleUrlSubmit();
                }}
                onPaste={(event) => {
                  const pastedText = event.clipboardData.getData("text");
                  if (pastedText.trim()) {
                    event.preventDefault();
                    submitUrl(pastedText);
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUrlSubmit}
                style={{ boxShadow: "none" }}
                disabled={!urlInput.trim() || createAsset.isPending}
                className="absolute right-0 top-0 z-50 size-10 rounded-l-sm rounded-r-none border-0 duration-200 hover:bg-transparent active:scale-95"
              >
                {createAsset.isPending ? (
                  <Loader2 className="size-3.5 animate-spin stroke-[1.5] text-neutral-500 dark:text-neutral-400" />
                ) : (
                  <ArrowUpIcon className="size-3.5 stroke-[1.5]" />
                )}
              </Button>
            </div>
            <div className="h-10 w-px bg-muted-foreground/20" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="size-10 rounded-l-none border-0"
            >
              <Upload className="size-3.5 stroke-[1.5]" />
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}
