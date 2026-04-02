"use client";

import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";

import type { Folder } from "@/app/bookmarks/page";
import { formatDate } from "@/utils/format-date";
import { isValidURL } from "@/utils/url-validator";
import type { BookmarkRecord } from "@/utils/folder-pending-actions";
import {
  CircleCheckIcon,
  CopyIcon,
  FolderOpenIcon,
  Globe,
  Palette,
  Pencil,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
import { getGoogleFavicon } from "@/utils/google-favicon";

export const Bookmark = ({
  bookmark,
  showOgImage,
  isPublicPage,
  folders,
  onDelete,
  onMove,
  isActionPending = false,
}: {
  bookmark: BookmarkRecord;
  showOgImage: boolean;
  isPublicPage: boolean;
  folders: Folder[];
  onDelete?: (bookmark: BookmarkRecord) => void;
  onMove?: (bookmark: BookmarkRecord, folderId: string) => void;
  isActionPending?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteExitTimeoutRef = useRef<number | null>(null);
  const [title, setTitle] = useState(bookmark.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isFaviconUnavailable, setIsFaviconUnavailable] = useState(false);
  const [isDeleteExiting, setIsDeleteExiting] = useState(false);

  const isColor = bookmark.type === "color";

  const filteredFolders = folders.filter(
    (folder) => folder.id !== bookmark.folderId && folder.type === "bookmarks"
  );

  const updateTitle = useMutation(
    trpc.bookmarks.updateTitle.mutationOptions({
      onMutate: async ({ id, title: newTitle }) => {
        await queryClient.cancelQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });

        const previousBookmarks = queryClient.getQueryData([
          "bookmarks",
          "getBookmarksByFolderId",
          bookmark.folderId,
        ]);

        queryClient.setQueryData(
          ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
          (old: any) => {
            if (!old) return old;

            const newPages = old.pages.map((page: any[]) =>
              page.map((currentBookmark: any) =>
                currentBookmark.id === id
                  ? { ...currentBookmark, title: newTitle }
                  : currentBookmark
              )
            );

            return {
              ...old,
              pages: newPages,
            };
          }
        );

        return { previousBookmarks };
      },
      onError: (_, __, context) => {
        if (context?.previousBookmarks) {
          queryClient.setQueryData(
            ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
            context.previousBookmarks
          );
        }
        setTitle(bookmark.title);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", bookmark.folderId],
        });
        toast.custom(() => (
          <div className="flex justify-center mx-auto">
            <div className="bg-popover text-popover-foreground border border-input rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5 shadow-lg">
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

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    setTitle(bookmark.title);
  }, [bookmark.id, bookmark.title]);

  useEffect(() => {
    return () => {
      if (deleteExitTimeoutRef.current) {
        window.clearTimeout(deleteExitTimeoutRef.current);
      }
    };
  }, []);

  const handlePointerEnter = () => {
    if (deleteExitTimeoutRef.current) {
      window.clearTimeout(deleteExitTimeoutRef.current);
      deleteExitTimeoutRef.current = null;
    }

    setIsDeleteExiting(false);
  };

  const handlePointerLeave = () => {
    if (deleteExitTimeoutRef.current) {
      window.clearTimeout(deleteExitTimeoutRef.current);
    }

    setIsDeleteExiting(true);

    deleteExitTimeoutRef.current = window.setTimeout(() => {
      setIsDeleteExiting(false);
      deleteExitTimeoutRef.current = null;
    }, 160);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={`group flex items-center justify-between md:px-2.5 px-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-sm ${
            showOgImage ? "h-16" : "h-12"
          } ${isEditingTitle ? "cursor-default" : "cursor-pointer"} ${
            isActionPending ? "opacity-70" : ""
          }`}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={() => {
            if (isEditingTitle) {
              return;
            }

            if (isColor && bookmark.color) {
              navigator.clipboard.writeText(bookmark.color);
              toast.custom(() => (
                <div className="flex justify-center mx-auto">
                  <div className="bg-popover text-popover-foreground border border-input rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5 shadow-lg">
                    <CircleCheckIcon
                      className="size-3.5 text-green-400 dark:text-green-600 fill-green-400/20 dark:fill-green-600/30"
                      strokeWidth={2.2}
                    />
                    <h1>Color copied to clipboard</h1>
                  </div>
                </div>
              ));
            } else if (bookmark.url) {
              window.open(bookmark.url, "_blank");
            }
          }}
        >
          <div className="flex items-center gap-3 w-[calc(100%-4rem)]">
            {isColor && bookmark.color ? (
              showOgImage ? (
                <div
                  className="w-20 h-10 min-w-20 min-h-10 mr-1 max-w-20 max-h-10 rounded-[3px]"
                  style={{ backgroundColor: bookmark.color }}
                />
              ) : (
                <div
                  className="w-4 h-4 min-w-4 min-h-4 rounded-full"
                  style={{ backgroundColor: bookmark.color }}
                />
              )
            ) : (
              <>
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
                        unoptimized
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
                        src={getGoogleFavicon(bookmark.url!)}
                        alt="Favicon"
                        className="w-4 h-4 rounded-xs"
                        width={16}
                        height={16}
                        onError={() => setIsFaviconUnavailable(true)}
                        unoptimized
                      />
                    ) : (
                      <Globe className="size-4 text-neutral-300 dark:text-neutral-600 min-w-4 min-h-4" />
                    )}
                  </>
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
                        title,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingTitle(false);
                        updateTitle.mutate({
                          id: bookmark.id,
                          title,
                        });
                      }
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setTitle(bookmark.title);
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
                {showOgImage && !isColor && (
                  <>
                    {bookmark.faviconUrl &&
                    bookmark.faviconUrl !== "undefined" &&
                    isValidURL(bookmark.faviconUrl) &&
                    !isFaviconUnavailable ? (
                      <Image
                        src={getGoogleFavicon(bookmark.url!)}
                        alt="Favicon"
                        className="size-2.5 rounded-xs"
                        width={16}
                        height={16}
                        onError={() => setIsFaviconUnavailable(true)}
                        unoptimized
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
                        ? "md:max-w-[12rem] hidden md:block"
                        : "md:max-w-[20rem] hidden md:block"
                    }`}
                  >
                    {isColor
                      ? bookmark.color
                      : bookmark.description
                      ? bookmark.description
                      : bookmark.url
                          ?.replace(/^(https?:\/\/)/, "")
                          .replace(/\/$/, "")}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isPublicPage && (
            <div className="relative hidden min-w-20 justify-end md:flex">
              <span
                className={`text-xs dark:text-muted-foreground/30 text-muted-foreground/50 tabular-nums text-right transition-all duration-170 ${
                  isActionPending
                    ? "opacity-100"
                    : "translate-x-0 opacity-100 blur-0 group-hover:translate-x-2 group-hover:opacity-0 group-hover:blur-[4px] group-focus-within:translate-x-2 group-focus-within:opacity-0 group-focus-within:blur-[4px]"
                }`}
              >
                {formatDate(new Date(bookmark.createdAt))}
              </span>
              {!isActionPending && onDelete && (
                <button
                  type="button"
                  aria-label="Delete bookmark"
                  className="absolute right-0 top-1/2 z-10 flex h-8 -translate-y-1/2 translate-x-2 cursor-pointer items-center rounded-sm px-2 text-neutral-500 dark:text-neutral-400 opacity-0 pointer-events-none transition-all duration-150 hover:bg-destructive/5 hover:text-destructive group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto dark:hover:bg-destructive/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(bookmark);
                  }}
                >
                  <X
                    className={`size-3.5 stroke-[1.5] transition-[filter] duration-150 ${
                      isDeleteExiting ? "blur-[2px]" : "blur-0"
                    }`}
                  />
                </button>
              )}
            </div>
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
              <Pencil className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
              Edit title
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          onClick={() => {
            const textToCopy = isColor
              ? bookmark.color ?? ""
              : bookmark.url ?? "";
            navigator.clipboard.writeText(textToCopy);
            toast.custom(() => (
              <div className="flex justify-center mx-auto">
                <div className="bg-popover text-popover-foreground border border-input rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5 shadow-lg">
                  <CircleCheckIcon
                    className="size-3.5 text-green-400 dark:text-green-600 fill-green-400/20 dark:fill-green-600/30"
                    strokeWidth={2.2}
                  />
                  <h1>{isColor ? "Color" : "Link"} copied to clipboard</h1>
                </div>
              </div>
            ));
          }}
          className="flex items-center gap-2"
        >
          {isColor ? (
            <Palette className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
          ) : (
            <CopyIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
          )}
          {isColor ? "Copy color" : "Copy link"}
        </ContextMenuItem>
        {!isPublicPage &&
          !isActionPending &&
          onMove &&
          filteredFolders.length > 0 && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger
                  inset
                  className="justify-start cursor-pointer"
                >
                  <FolderOpenIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20 mr-2" />
                  Move
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-44">
                  {filteredFolders.map((folder, index) => (
                    <div key={folder.id}>
                      <ContextMenuItem
                        onClick={() => {
                          onMove(bookmark, folder.id);
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
            </>
          )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
