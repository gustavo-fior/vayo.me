"use client";

import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  CircleCheckIcon,
  CopyIcon,
  FolderOpenIcon,
  Globe,
  ImageIcon,
  Palette,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import { formatDate } from "@/utils/format-date";
import { getGoogleFavicon } from "@/utils/google-favicon";
import { getItemDomain, getItemSubtitle } from "@/utils/item-display";
import { isMediaItem, type FolderRecord, type ItemRecord } from "@/types/items";
import { Input } from "./ui/input";
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
import { AssetMedia } from "./canvas/asset-media";

export const Bookmark = ({
  bookmark,
  showOgImage,
  isPublicPage,
  folders,
  onDelete,
  onMove,
  onPreview,
  isActionPending = false,
}: {
  bookmark: ItemRecord;
  showOgImage: boolean;
  isPublicPage: boolean;
  folders: FolderRecord[];
  onDelete?: (bookmark: ItemRecord) => void;
  onMove?: (bookmark: ItemRecord, folderId: string) => void;
  onPreview?: (bookmark: ItemRecord) => void;
  isActionPending?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteExitTimeoutRef = useRef<number | null>(null);
  const [title, setTitle] = useState(bookmark.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isFaviconUnavailable, setIsFaviconUnavailable] = useState(false);
  const [isDeleteExiting, setIsDeleteExiting] = useState(false);

  const filteredFolders = folders.filter(
    (folder) => folder.id !== bookmark.folderId
  );
  const isColor = bookmark.type === "color";
  const isMedia = isMediaItem(bookmark);

  const updateTitle = useMutation(
    trpc.items.updateTitle.mutationOptions({
      onMutate: async ({ id, title: nextTitle }) => {
        await queryClient.cancelQueries({
          queryKey: ["items", "folder", bookmark.folderId],
        });

        const previousEntries = queryClient.getQueriesData({
          queryKey: ["items", "folder", bookmark.folderId],
        });

        previousEntries.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;

            if (Array.isArray(old)) {
              return old.map((item) =>
                item.id === id ? { ...item, title: nextTitle } : item
              );
            }

            if (old.pages) {
              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.map((item: any) =>
                    item.id === id ? { ...item, title: nextTitle } : item
                  )
                ),
              };
            }

            return old;
          });
        });

        return { previousEntries };
      },
      onError: (_error, _variables, context) => {
        context?.previousEntries?.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
        setTitle(bookmark.title);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["items", "folder", bookmark.folderId],
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

  const handlePrimaryAction = () => {
    if (isEditingTitle) {
      return;
    }

    if (isColor && bookmark.color) {
      navigator.clipboard.writeText(bookmark.color);
      toast.success("Color copied to clipboard");
      return;
    }

    if (isMedia) {
      onPreview?.(bookmark);
      return;
    }

    if (bookmark.url) {
      window.open(bookmark.url, "_blank");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={`group flex items-center justify-between rounded-sm md:px-2.5 px-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 ${
            showOgImage ? "min-h-16 py-2" : "h-12"
          } ${isEditingTitle ? "cursor-default" : "cursor-pointer"} ${
            isActionPending ? "opacity-70" : ""
          }`}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={handlePrimaryAction}
        >
          <div className="flex w-[calc(100%-4rem)] items-center gap-3">
            {isColor && bookmark.color ? (
              showOgImage ? (
                <div
                  className="h-10 max-h-10 min-h-10 w-20 max-w-20 min-w-20 rounded-[3px]"
                  style={{ backgroundColor: bookmark.color }}
                />
              ) : (
                <div
                  className="h-4 min-h-4 w-4 min-w-4 rounded-full"
                  style={{ backgroundColor: bookmark.color }}
                />
              )
            ) : isMedia ? (
              showOgImage ? (
                <div className="relative h-10 min-h-10 w-20 min-w-20 overflow-hidden rounded-[3px] border border-border/40 bg-muted/30">
                  <AssetMedia
                    asset={bookmark}
                    rounded
                    className="absolute inset-0"
                    mediaClassName="object-cover rounded-[3px]"
                  />
                </div>
              ) : (
                <div className="relative size-4 min-h-4 min-w-4 overflow-hidden rounded-xs border border-border/40 bg-muted/30">
                  <AssetMedia
                    asset={bookmark}
                    rounded
                    className="absolute inset-0"
                    mediaClassName="object-cover rounded-xs"
                  />
                </div>
              )
            ) : (
              <>
                {bookmark.ogImageUrl && showOgImage ? (
                  <div className="relative h-10 min-h-10 w-20 min-w-20 overflow-hidden rounded-[3px] bg-muted/30">
                    <Image
                      src={bookmark.ogImageUrl}
                      alt="OG image"
                      width={320}
                      height={180}
                      className="h-10 w-20 object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}
                {!bookmark.ogImageUrl && showOgImage ? (
                  <div className="flex h-10 min-h-10 w-20 min-w-20 items-center justify-center rounded-[3px] bg-muted-foreground/10">
                    <Globe className="size-3 text-neutral-300 dark:text-neutral-600" />
                  </div>
                ) : null}
                {!showOgImage && (
                  <>
                    {bookmark.faviconUrl &&
                    bookmark.url &&
                    !isFaviconUnavailable ? (
                      <Image
                        src={getGoogleFavicon(bookmark.url)}
                        alt="Favicon"
                        className="h-4 w-4 rounded-xs"
                        width={16}
                        height={16}
                        onError={() => setIsFaviconUnavailable(true)}
                        unoptimized
                      />
                    ) : (
                      <Globe className="size-4 min-h-4 min-w-4 text-neutral-300 dark:text-neutral-600" />
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
                <div
                  className="w-full"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Input
                    ref={inputRef}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-5 w-full border-none bg-transparent px-0 py-0 text-sm font-medium shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    onBlur={() => {
                      setIsEditingTitle(false);
                      updateTitle.mutate({ id: bookmark.id, title });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setIsEditingTitle(false);
                        updateTitle.mutate({ id: bookmark.id, title });
                      }
                      if (event.key === "Escape") {
                        setIsEditingTitle(false);
                        setTitle(bookmark.title);
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <p
                  className={`truncate text-sm font-medium ${
                    showOgImage
                      ? "max-w-[14rem] md:max-w-[22rem]"
                      : "max-w-[18rem]"
                  }`}
                >
                  {bookmark.title}
                </p>
              )}

              {!showOgImage && !isEditingTitle && (
                <span className="hidden text-sm text-muted-foreground/30 md:block">
                  •
                </span>
              )}

              <div className="flex items-center gap-1.5">
                {showOgImage && !isColor && !isMedia && (
                  <>
                    {bookmark.faviconUrl &&
                    bookmark.url &&
                    !isFaviconUnavailable ? (
                      <Image
                        src={getGoogleFavicon(bookmark.url)}
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
                    {getItemSubtitle(bookmark) || getItemDomain(bookmark.url)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isPublicPage && (
            <div className="relative hidden min-w-20 justify-end md:flex">
              <span
                className={`text-right text-xs tabular-nums text-muted-foreground/50 transition-all duration-170 dark:text-muted-foreground/30 ${
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
                  aria-label="Delete item"
                  className="pointer-events-none absolute right-0 top-1/2 z-10 flex h-8 -translate-y-1/2 translate-x-2 cursor-pointer items-center rounded-sm px-2 text-neutral-500 opacity-0 transition-all duration-150 hover:bg-destructive/5 hover:text-destructive group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 dark:text-neutral-400 dark:hover:bg-destructive/5"
                  onClick={(event) => {
                    event.stopPropagation();
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
              onClick={() => setIsEditingTitle(true)}
            >
              <Pencil className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
              Edit title
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          className="flex items-center gap-2"
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
        >
          {isColor ? (
            <Palette className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
          ) : (
            <CopyIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
          )}
          {isColor ? "Copy color" : "Copy link"}
        </ContextMenuItem>
        {bookmark.type === "image" && bookmark.url && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="flex items-center gap-2"
              onClick={async () => {
                try {
                  const res = await fetch(bookmark.url ?? "");
                  const blob = await res.blob();
                  await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type || "image/png"]: blob }),
                  ]);
                  toast.success("Image copied to clipboard");
                } catch {
                  toast.error("Failed to copy image");
                }
              }}
            >
              <ImageIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
              Copy image
            </ContextMenuItem>
          </>
        )}
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
                  <FolderOpenIcon className="mr-2 size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                  Move
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-44">
                  {filteredFolders.map((folder, index) => (
                    <div key={folder.id}>
                      <ContextMenuItem
                        onClick={() => onMove(bookmark, folder.id)}
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
