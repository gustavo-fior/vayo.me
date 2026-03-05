"use client";

import { CircleCheckIcon, CopyIcon, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import Image from "next/image";

export type CanvasAssetType = {
  id: string;
  url: string;
  assetType: "image" | "video";
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  originalFilename: string | null;
  canvasX: number | null;
  canvasY: number | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  sortOrder: number;
  canvasZIndex: number;
  folderId: string;
  createdAt: string;
  updatedAt: string;
  _temp?: boolean;
};

export function AssetCard({
  asset,
  onDelete,
  onPreview,
  isPublic = false,
}: {
  asset: CanvasAssetType;
  onDelete?: (id: string) => void;
  onPreview?: (asset: CanvasAssetType) => void;
  isPublic?: boolean;
}) {
  const content =
    asset.assetType === "video" ? (
      <video
        src={asset.url}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover rounded-md"
      />
    ) : (
      <Image
        src={asset.url}
        alt={asset.originalFilename || "Asset"}
        width={asset.width ?? 1000}
        height={asset.height ?? 1000}
        loading="eager"
        priority
        className="w-full h-full object-cover rounded-md"
      />
    );

  if (isPublic) {
    return (
      <div
        className="break-inside-avoid mb-3 overflow-hidden rounded-md group cursor-pointer"
        onClick={() => onPreview?.(asset)}
      >
        {content}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="break-inside-avoid mb-3 overflow-hidden rounded-md group cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onPreview?.(asset)}
        >
          {content}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem
          className="flex items-center gap-2"
          onClick={() => window.open(asset.url, "_blank")}
        >
          <ExternalLink className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
          Open in new tab
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="flex items-center gap-2"
          onClick={() => {
            navigator.clipboard.writeText(asset.url);
            toast.custom(() => (
              <div className="flex justify-center mx-auto">
                <div className="bg-popover text-popover-foreground border border-input/50 rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5">
                  <CircleCheckIcon
                    className="size-3.5 text-green-400 dark:text-green-600"
                    strokeWidth={2.2}
                  />
                  <h1>URL copied to clipboard</h1>
                </div>
              </div>
            ));
          }}
        >
          <CopyIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
          Copy URL
        </ContextMenuItem>
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="flex items-center gap-2 hover:text-destructive focus:text-destructive group"
              disabled={asset._temp}
              onClick={() => onDelete(asset.id)}
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
