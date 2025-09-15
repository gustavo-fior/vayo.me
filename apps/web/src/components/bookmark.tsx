"use client";

import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";

import type { Folder } from "@/app/bookmarks/page";
import { formatDate } from "@/utils/format-date";
import { isValidURL } from "@/utils/url-validator";
import {
  CircleCheckIcon,
  CopyIcon,
  FolderOpenIcon,
  Globe,
  Pencil,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Bookmark as BookmarkType } from "server/src/trpc/routers/bookmarks";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Input } from "./ui/input";

export const Bookmark = ({
  bookmark,
  showOgImage,
  isPublicPage,
  folders,
}: {
  bookmark: BookmarkType;
  showOgImage: boolean;
  isPublicPage: boolean;
  folders: Folder[];
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(bookmark.title);
  const [isHovering, setIsHovering] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isFaviconUnavailable, setIsFaviconUnavailable] = useState(false);

  const filteredFolders = folders.filter(
    (folder) => folder.id !== bookmark.folderId
  );

  const deleteBookmark = useMutation(
    trpc.bookmarks.deleteBookmark.mutationOptions({
      onMutate: async (bookmarkId) => {
        // Cancel any outgoing refetches to avoid conflicts
        await queryClient.cancelQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });

        // Snapshot the previous bookmarks data
        const previousBookmarks = queryClient.getQueryData([
          "bookmarks",
          "getBookmarksByFolderId",
          bookmark.folderId,
        ]);

        // Optimistically remove the bookmark from the cache
        queryClient.setQueryData(
          ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
          (old: any) => {
            if (!old) return old;

            // Remove the bookmark from all pages of the infinite query
            const newPages = old.pages.map((page: any[]) =>
              page.filter((b: any) => b.id !== bookmarkId)
            );

            return {
              ...old,
              pages: newPages,
            };
          }
        );

        // Return context for rollback
        return { previousBookmarks };
      },
      onError: (_, __, context) => {
        // Rollback to previous state on error
        if (context?.previousBookmarks) {
          queryClient.setQueryData(
            ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
            context.previousBookmarks
          );
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });

        toast.custom(() => (
          <div className="flex justify-center mx-auto">
            <div className="bg-popover text-popover-foreground border border-border rounded-full px-4 pr-5 py-2 text-sm font-medium flex items-center gap-2">
              <CircleCheckIcon
                className="size-3.5 text-green-400 dark:text-green-600"
                strokeWidth={2.2}
              />
              <h1>Bookmark deleted</h1>
            </div>
          </div>
        ));
      },
    })
  );

  const updateTitle = useMutation(
    trpc.bookmarks.updateTitle.mutationOptions({
      onMutate: async ({ id, title: newTitle }) => {
        // Cancel any outgoing refetches to avoid conflicts
        await queryClient.cancelQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });

        // Snapshot the previous bookmarks data
        const previousBookmarks = queryClient.getQueryData([
          "bookmarks",
          "getBookmarksByFolderId",
          bookmark.folderId,
        ]);

        // Optimistically update the bookmark title in the cache
        queryClient.setQueryData(
          ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
          (old: any) => {
            if (!old) return old;

            // Update the title in all pages of the infinite query
            const newPages = old.pages.map((page: any[]) =>
              page.map((b: any) =>
                b.id === id ? { ...b, title: newTitle } : b
              )
            );

            return {
              ...old,
              pages: newPages,
            };
          }
        );

        // Return context for rollback
        return { previousBookmarks };
      },
      onError: (_, __, context) => {
        // Rollback to previous state on error
        if (context?.previousBookmarks) {
          queryClient.setQueryData(
            ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
            context.previousBookmarks
          );
        }
        // Reset local title state to original value
        setTitle(bookmark.title);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });
        toast.custom(() => (
          <div className="flex justify-center mx-auto">
            <div className="bg-popover text-popover-foreground border border-border rounded-full px-4 pr-5 py-2 text-sm font-medium flex items-center gap-2">
              <CircleCheckIcon
                className="size-3.5 text-green-400 dark:text-green-600"
                strokeWidth={2.2}
              />
              <h1>Title updated</h1>
            </div>
          </div>
        ));
      },
    })
  );

  const moveBookmarkToFolder = useMutation(
    trpc.bookmarks.moveBookmarkToFolder.mutationOptions({
      onMutate: async ({ bookmarkId, folderId: newFolderId }) => {
        // Cancel any outgoing refetches to avoid conflicts
        await queryClient.cancelQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });

        // Snapshot the previous bookmarks data
        const previousBookmarks = queryClient.getQueryData([
          "bookmarks",
          "getBookmarksByFolderId",
          bookmark.folderId,
        ]);

        // Optimistically remove the bookmark from the current folder
        queryClient.setQueryData(
          ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
          (old: any) => {
            if (!old) return old;

            // Remove the bookmark from all pages of the infinite query
            const newPages = old.pages.map((page: any[]) =>
              page.filter((b: any) => b.id !== bookmarkId)
            );

            return {
              ...old,
              pages: newPages,
            };
          }
        );

        // Return context for rollback
        return { previousBookmarks, originalFolderId: bookmark.folderId };
      },
      onError: (_, __, context) => {
        // Rollback to previous state on error
        if (context?.previousBookmarks) {
          queryClient.setQueryData(
            ["bookmarks", "getBookmarksByFolderId", context.originalFolderId],
            context.previousBookmarks
          );
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });
      },
    })
  );

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingTitle, inputRef.current]);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={`flex items-center justify-between md:px-2.5 px-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-sm ${
            showOgImage ? "h-16" : "h-12"
          } ${isEditingTitle ? "cursor-default" : "cursor-pointer"}`}
          onClick={() => {
            if (isEditingTitle) {
              return;
            }

            window.open(bookmark.url, "_blank");
          }}
        >
          <div className="flex items-center gap-3 w-[calc(100%-4rem)]">
            {bookmark.ogImageUrl &&
              showOgImage &&
              isValidURL(bookmark.ogImageUrl) && (
                <div className="w-20 h-10 min-w-20 min-h-10 mr-1 max-w-20 max-h-10">
                  <Image
                    src={bookmark.ogImageUrl}
                    alt="OG Image"
                    className="rounded-[3px] object-cover h-10 w-20"
                    width={320}
                    height={180}
                  />
                </div>
              )}
            {!bookmark.ogImageUrl && showOgImage && (
              <div className="w-20 h-10 min-w-20 min-h-10 mr-1 max-w-20 max-h-10 rounded-[3px] bg-muted-foreground/10 flex items-center justify-center">
                <Globe className="size-3 text-neutral-300 dark:text-neutral-600" />
              </div>
            )}
            {!showOgImage && (
              <>
                {bookmark.faviconUrl &&
                bookmark.faviconUrl !== "undefined" &&
                isValidURL(bookmark.faviconUrl) &&
                !isFaviconUnavailable ? (
                  <Image
                    src={bookmark.faviconUrl}
                    alt="Favicon"
                    className="w-4 h-4 rounded-xs"
                    width={16}
                    height={16}
                    onError={() => setIsFaviconUnavailable(true)}
                  />
                ) : (
                  <Globe className="size-4 text-neutral-300 dark:text-neutral-600 min-w-4 min-h-4" />
                )}
              </>
            )}

            <div
              className={`flex w-full ${
                showOgImage ? "flex-col gap-1" : "items-center gap-2"
              }`}
            >
              {isEditingTitle ? (
                <div onClick={(e) => e.stopPropagation()} className="w-full">
                  <Input
                    ref={inputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 text-sm font-medium bg-transparent h-5 shadow-none"
                    onBlur={() => {
                      setIsEditingTitle(false);
                      updateTitle.mutate({
                        id: bookmark.id,
                        title: title,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingTitle(false);
                        updateTitle.mutate({
                          id: bookmark.id,
                          title: title,
                        });
                      }
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setTitle(bookmark.title); // Reset to original title
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <p
                  className={`truncate ${
                    showOgImage
                      ? "md:max-w-[22rem] max-w-[14rem]"
                      : "max-w-[18rem]"
                  } inline-block text-sm font-medium`}
                >
                  {bookmark.title}
                </p>
              )}
              {!showOgImage && !isEditingTitle && (
                <span className="text-sm text-muted-foreground/30 hidden md:block">
                  •
                </span>
              )}
              <div className="flex items-center gap-1.5">
                {showOgImage && (
                  <>
                    {bookmark.faviconUrl &&
                    bookmark.faviconUrl !== "undefined" &&
                    isValidURL(bookmark.faviconUrl) &&
                    !isFaviconUnavailable ? (
                      <Image
                        src={bookmark.faviconUrl}
                        alt="Favicon"
                        className="size-2.5 rounded-xs"
                        width={16}
                        height={16}
                        onError={() => setIsFaviconUnavailable(true)}
                      />
                    ) : (
                      <Globe className="size-3 text-neutral-300 dark:text-neutral-600" />
                    )}
                  </>
                )}
                {(!isEditingTitle || showOgImage) && (
                  <span
                    className={`text-xs text-muted-foreground/70 truncate ${
                      showOgImage
                        ? "md:max-w-[22rem] max-w-[14rem]"
                        : bookmark.title.length > 20
                        ? "md:max-w-[13rem] hidden md:block"
                        : "md:max-w-[20rem] hidden md:block"
                    }`}
                  >
                    {bookmark.description
                      ? bookmark.description
                      : bookmark.url
                          .replace(/^(https?:\/\/)/, "")
                          .replace(/\/$/, "")}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isPublicPage && (
            <AnimatePresence mode="popLayout">
              {isHovering ? (
                <motion.button
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="z-10 cursor-pointer hover:text-destructive px-2 hover:bg-destructive/5 dark:hover:bg-destructive/5 rounded-sm h-8 text-muted-foreground/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark.mutate(bookmark.id);
                  }}
                >
                  <X className="size-3.5" />
                </motion.button>
              ) : (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-xs text-muted-foreground/50 hidden md:block tabular-nums min-w-20 text-right"
                >
                  {formatDate(new Date(bookmark.createdAt))}
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        {!isPublicPage && (
          <>
            <ContextMenuItem
              className="flex items-center gap-2"
              onClick={() => {
                setIsEditingTitle(true);
              }}
            >
              <Pencil className="size-3.5 text-neutral-500" />
              Edit title
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {!isPublicPage && filteredFolders.length > 0 && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger
                inset
                className="justify-start cursor-pointer"
              >
                <FolderOpenIcon className="size-3.5 text-neutral-500 mr-2" />
                Move
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-44">
                {filteredFolders.map((folder, index) => (
                  <div key={folder.id}>
                    <ContextMenuItem
                      key={folder.id}
                      onClick={() => {
                        moveBookmarkToFolder.mutate({
                          bookmarkId: bookmark.id,
                          folderId: folder.id,
                        });
                      }}
                    >
                      {folder.icon && <span>{folder.icon}</span>}
                      {folder.name}
                    </ContextMenuItem>
                    {index !== filteredFolders.length - 1 && (
                      <ContextMenuSeparator />
                    )}
                  </div>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          onClick={() => {
            navigator.clipboard.writeText(bookmark.url);
            toast.custom(() => (
              <div className="flex justify-center mx-auto">
                <div className="bg-popover text-popover-foreground border border-border rounded-full px-4 pr-5 py-2 text-sm font-medium flex items-center gap-2">
                  <CircleCheckIcon
                    className="size-3.5 text-green-400 dark:text-green-600"
                    strokeWidth={2.2}
                  />
                  <h1>Link copied to clipboard</h1>
                </div>
              </div>
            ));
          }}
          className="flex items-center gap-2"
        >
          <CopyIcon className="size-3.5 text-neutral-500" />
          Copy link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
