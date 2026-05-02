"use client";

import Image from "next/image";
import {
  CircleCheckIcon,
  CopyIcon,
  ExternalLink,
  FolderOpenIcon,
  Globe,
  ImageIcon,
  Palette,
  Trash2,
} from "lucide-react";
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
} from "../ui/context-menu";
import { AssetMedia } from "./asset-media";
import type { FolderRecord, ItemRecord } from "@/types/items";
import { getItemDomain, getItemSubtitle } from "@/utils/item-display";
import { isMediaItem } from "@/types/items";
import { getGoogleFavicon } from "@/utils/google-favicon";
import { getPlaceholderColor } from "@/utils/placeholder-color";
import { isValidURL } from "@/utils/url-validator";
import { useState } from "react";

export type CanvasAssetType = ItemRecord;

function copyItemValue(item: ItemRecord) {
  const value = item.type === "color" ? item.color ?? "" : item.url ?? "";
  navigator.clipboard.writeText(value);
  toast.custom(
    () => (
      <div className="flex justify-center mx-auto">
        <div className="bg-popover text-popover-foreground border border-input rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5 shadow-lg">
          <CircleCheckIcon
            className="size-3.5 text-green-400 dark:text-green-600"
            strokeWidth={2.2}
          />
          <h1>
            {item.type === "color"
              ? "Color copied to clipboard"
              : "URL copied to clipboard"}
          </h1>
        </div>
      </div>
    ),
    { position: "top-center" }
  );
}

function LinkCard({ item, rounded }: { item: ItemRecord; rounded: boolean }) {
  const radiusClass = rounded ? "rounded-md" : "rounded-none";
  const domain = getItemDomain(item.url);
  const [hasOgImage, setHasOgImage] = useState(
    Boolean(item.ogImageUrl && isValidURL(item.ogImageUrl))
  );

  return (
    <div
      className={`overflow-hidden border border-border/50 bg-card ${radiusClass}`}
    >
      <div
        className="relative aspect-[16/10] w-full overflow-hidden bg-muted/30"
        style={hasOgImage ? undefined : { backgroundColor: getPlaceholderColor(item.id) }}
      >
        {hasOgImage && (
          <Image
            src={item.ogImageUrl ?? ""}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
            onError={() => {
              setHasOgImage(false);
            }}
          />
        )}
      </div>
      <div className="flex items-start gap-3 p-3">
        {item.faviconUrl && item.url ? (
          <Image
            src={getGoogleFavicon(item.url)}
            alt=""
            width={16}
            height={16}
            className="mt-[5px] size-4 rounded-xs"
            unoptimized
          />
        ) : (
          <Globe className="mt-[5px] size-4 text-muted-foreground/60" />
        )}
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {domain}
          </p>
        </div>
      </div>
    </div>
  );
}

function ColorCard({ item, rounded }: { item: ItemRecord; rounded: boolean }) {
  const radiusClass = rounded ? "rounded-md" : "rounded-none";

  return (
    <div
      className={`overflow-hidden border border-border/40 bg-card ${radiusClass}`}
    >
      <div
        className="aspect-[4/3] w-full"
        style={{ backgroundColor: item.color ?? "#e5e5e5" }}
      />
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium uppercase">{item.title}</p>
        <p className="truncate text-xs lowercase text-muted-foreground/70">
          {item.color}
        </p>
      </div>
    </div>
  );
}

export function AssetCard({
  asset,
  rounded = true,
  folderId,
  folders = [],
  onDelete,
  onMove,
  onPreview,
  isPublic = false,
  isActionPending = false,
}: {
  asset: CanvasAssetType;
  rounded?: boolean;
  folderId?: string;
  folders?: FolderRecord[];
  onDelete?: (asset: CanvasAssetType) => void;
  onMove?: (asset: CanvasAssetType, folderId: string) => void;
  onPreview?: (asset: CanvasAssetType) => void;
  isPublic?: boolean;
  isActionPending?: boolean;
}) {
  const availableFolders = folders.filter((f) => f.id !== folderId);
  const radiusClass = rounded ? "rounded-md" : "rounded-none";
  const [naturalDims, setNaturalDims] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const mediaWidth = asset.width ?? naturalDims?.width;
  const mediaHeight = asset.height ?? naturalDims?.height;

  const content = isMediaItem(asset) ? (
    <div
      className={`relative w-full overflow-hidden border border-border/30 bg-card ${radiusClass}`}
      style={{
        aspectRatio:
          mediaWidth && mediaHeight
            ? `${mediaWidth} / ${mediaHeight}`
            : "4 / 3",
      }}
    >
      <AssetMedia
        asset={asset}
        rounded={rounded}
        className="absolute inset-0"
        onDimensions={(dims) => {
          if (!asset.width || !asset.height) setNaturalDims(dims);
        }}
      />
    </div>
  ) : asset.type === "color" ? (
    <ColorCard item={asset} rounded={rounded} />
  ) : (
    <LinkCard item={asset} rounded={rounded} />
  );

  const handlePrimaryAction = () => {
    if (asset.type === "color" && asset.color) {
      copyItemValue(asset);
      return;
    }

    if (isMediaItem(asset)) {
      onPreview?.(asset);
      return;
    }

    if (asset.url) {
      window.open(asset.url, "_blank");
    }
  };

  if (isPublic) {
    return (
      <div
        className={`break-inside-avoid mb-3 overflow-hidden ${radiusClass} group cursor-pointer ${
          isActionPending ? "opacity-70" : ""
        }`}
        onClick={handlePrimaryAction}
      >
        {content}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={`break-inside-avoid mb-3 overflow-hidden ${radiusClass} group cursor-pointer transition-opacity hover:opacity-95 ${
            isActionPending ? "opacity-70" : ""
          }`}
          onClick={handlePrimaryAction}
        >
          {content}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {asset.url && (
          <>
            <ContextMenuItem
              className="flex items-center gap-2"
              onClick={() => window.open(asset.url ?? "", "_blank")}
            >
              <ExternalLink className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
              Open in new tab
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          className="flex items-center gap-2"
          onClick={() => copyItemValue(asset)}
        >
          {asset.type === "color" ? (
            <Palette className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
          ) : (
            <CopyIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
          )}
          {asset.type === "color" ? "Copy color" : "Copy URL"}
        </ContextMenuItem>

        {asset.type === "image" && asset.url && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="flex items-center gap-2"
              onClick={async () => {
                try {
                  const res = await fetch(asset.url ?? "");
                  const blob = await res.blob();
                  const pngBlob =
                    blob.type === "image/png"
                      ? blob
                      : await new Promise<Blob>((resolve) => {
                          const image = new window.Image();
                          image.crossOrigin = "anonymous";
                          image.onload = () => {
                            const canvas = document.createElement("canvas");
                            canvas.width = image.naturalWidth;
                            canvas.height = image.naturalHeight;
                            canvas.getContext("2d")!.drawImage(image, 0, 0);
                            canvas.toBlob(
                              (nextBlob) => resolve(nextBlob!),
                              "image/png"
                            );
                          };
                          image.src = asset.url ?? "";
                        });
                  await navigator.clipboard.write([
                    new ClipboardItem({ "image/png": pngBlob }),
                  ]);
                  toast.success("Image copied to clipboard");
                } catch {
                  toast.error("Failed to copy image");
                }
              }}
            >
              <ImageIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
              Copy image
            </ContextMenuItem>
          </>
        )}

        {onMove && !isActionPending && availableFolders.length > 0 && (
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
                {availableFolders.map((folder, index) => (
                  <div key={folder.id}>
                    <ContextMenuItem onClick={() => onMove(asset, folder.id)}>
                      {folder.icon && <span>{folder.icon}</span>}
                      {folder.name}
                    </ContextMenuItem>
                    {index !== availableFolders.length - 1 && (
                      <ContextMenuSeparator />
                    )}
                  </div>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {onDelete && !isActionPending && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="flex items-center gap-2 hover:text-destructive focus:text-destructive group"
              disabled={asset._temp}
              onClick={() => onDelete(asset)}
            >
              <Trash2 className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20 group-hover:text-destructive/20 group-focus:text-destructive" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
