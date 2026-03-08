"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ImageIcon, Loader2, Upload, Link, ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";

export function AssetUploadZone({
  folderId,
  floating = false,
}: {
  folderId: string;
  floating?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const createAsset = useMutation(
    trpc.canvasAssets.createAsset.mutationOptions({
      onError: () => {
        toast.error("Failed to create asset");
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
      const now = new Date().toISOString();

      // Immediately insert a fake asset with the blob preview URL
      queryClient.setQueryData(
        ["canvasAssets", "getAssetsByFolderId", folderId],
        (old: any) => {
          if (!old) {
            return {
              pages: [
                [
                  {
                    id: tempId,
                    _temp: true,
                    url: previewUrl,
                    assetType,
                    mimeType: file.type,
                    fileSize: file.size,
                    width: null,
                    height: null,
                    originalFilename: file.name,
                    canvasX: null,
                    canvasY: null,
                    canvasWidth: null,
                    canvasHeight: null,
                    sortOrder: 0,
                    folderId,
                    createdAt: now,
                    updatedAt: now,
                  },
                ],
              ],
              pageParams: [1],
            };
          }
          return {
            ...old,
            pages: old.pages.map((page: any[], i: number) =>
              i === 0
                ? [
                    {
                      id: tempId,
                      _temp: true,
                      url: previewUrl,
                      assetType,
                      mimeType: file.type,
                      fileSize: file.size,
                      width: null,
                      height: null,
                      originalFilename: file.name,
                      canvasX: null,
                      canvasY: null,
                      canvasWidth: null,
                      canvasHeight: null,
                      sortOrder: -1,
                      folderId,
                      createdAt: now,
                      updatedAt: now,
                    },
                    ...page,
                  ]
                : page
            ),
          };
        }
      );

      // Upload in background via signed URL (bypasses Vercel payload limit)
      try {
        // 1. Get signed upload URL from server
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

        const { signedUrl, token, publicUrl } = await urlRes.json();

        // 2. Upload file directly to Supabase Storage
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "x-upsert": "false",
          },
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
            onSuccess: (newAsset) => {
              // Swap the temp id with the real DB id so delete works
              queryClient.setQueryData(
                ["canvasAssets", "getAssetsByFolderId", folderId],
                (old: any) => {
                  if (!old) return old;
                  return {
                    ...old,
                    pages: old.pages.map((page: any[]) =>
                      page.map((a: any) => {
                        if (a.id !== tempId) return a;
                        const { _temp, ...rest } = a;
                        return { ...rest, id: newAsset.id };
                      })
                    ),
                  };
                }
              );
            },
          }
        );
      } catch (err: any) {
        toast.error(err.message || "Failed to upload file");
        // Remove the optimistic asset on failure
        queryClient.setQueryData(
          ["canvasAssets", "getAssetsByFolderId", folderId],
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: any[]) =>
                page.filter((a: any) => a.id !== tempId)
              ),
            };
          }
        );
      }
    },
    [folderId, createAsset]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach((file) => uploadFile(file));
    },
    [uploadFile]
  );

  // Global window-level drag events for full-page drop
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      e.dataTransfer?.types?.includes("Files") ?? false;

    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      if (!hasFiles(e)) {
        dragCounterRef.current = 0;
        setIsDragging(false);
        return;
      }
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
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

  const submitUrl = useCallback((rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return;
    const videoExts = [".mp4", ".webm", ".mov", ".ogg"];
    const isVideo = videoExts.some((ext) =>
      url.toLowerCase().split("?")[0].endsWith(ext)
    );
    const assetType = isVideo ? ("video" as const) : ("image" as const);
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Optimistic insert
    queryClient.setQueryData(
      ["canvasAssets", "getAssetsByFolderId", folderId],
      (old: any) => {
        const tempAsset = {
          id: tempId,
          _temp: true,
          url,
          assetType,
          mimeType: null,
          fileSize: null,
          width: null,
          height: null,
          originalFilename: null,
          canvasX: null,
          canvasY: null,
          canvasWidth: null,
          canvasHeight: null,
          sortOrder: -1,
          canvasZIndex: 0,
          folderId,
          createdAt: now,
          updatedAt: now,
        };
        if (!old) {
          return { pages: [[tempAsset]], pageParams: [1] };
        }
        return {
          ...old,
          pages: old.pages.map((page: any[], i: number) =>
            i === 0 ? [tempAsset, ...page] : page
          ),
        };
      }
    );

    createAsset.mutate(
      { folderId, url, assetType },
      {
        onSuccess: (newAsset) => {
          queryClient.setQueryData(
            ["canvasAssets", "getAssetsByFolderId", folderId],
            (old: any) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.map((a: any) => {
                    if (a.id !== tempId) return a;
                    const { _temp, ...rest } = a;
                    return { ...rest, ...newAsset, id: newAsset.id };
                  })
                ),
              };
            }
          );
        },
        onError: () => {
          queryClient.setQueryData(
            ["canvasAssets", "getAssetsByFolderId", folderId],
            (old: any) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.filter((a: any) => a.id !== tempId)
                ),
              };
            }
          );
        },
      }
    );

    setUrlInput("");
  }, [folderId, createAsset]);

  const handleUrlSubmit = useCallback(() => {
    submitUrl(urlInput);
  }, [urlInput, submitUrl]);

  return (
    <>
      {/* Full-screen drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-primary/10 p-5 mb-3">
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* URL input + browse button */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 1 }}
        className={
          floating
            ? "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            : undefined
        }
      >
        <div
          className={`flex ${
            floating
              ? "bg-neutral-100 dark:bg-neutral-900 backdrop-blur-sm rounded-lg border border-border shadow-lg"
              : ""
          }`}
        >
          <div className="relative flex-1">
            <Input
              placeholder="Paste image/video link"
              value={urlInput}
              style={{ boxShadow: "none" }}
              className="rounded-sm border-transparent h-10 dark:border-transparent focus-visible:border-transparent focus-visible:ring-0 bg-transparent text-primary placeholder:text-primary/50"
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUrlSubmit();
              }}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("text");
                if (pastedText.trim()) {
                  e.preventDefault();
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
              className="h-10 border-0 absolute right-0 top-0 z-50 rounded-sm active:scale-95 duration-200 hover:bg-transparent"
            >
              {createAsset.isPending ? (
                <Loader2 className="size-3.5 animate-spin stroke-[1.5] text-neutral-500 dark:text-neutral-400" />
              ) : (
                <ArrowUpIcon className="size-3.5 stroke-[1.5]" />
              )}
            </Button>
          </div>
          <div className="size-10 w-px bg-muted-foreground/20" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="size-10 gap-1.5 border-0 rounded-l-none"
          >
            <Upload className="size-3.5 stroke-[1.5]" />
          </Button>
        </div>
      </motion.div>
    </>
  );
}
