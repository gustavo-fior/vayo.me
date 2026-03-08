"use client";

import {
  CircleCheckIcon,
  CopyIcon,
  ExternalLink,
  FolderOpenIcon,
  ImageIcon,
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
import Image from "next/image";
import type { Folder } from "@/app/bookmarks/page";

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
  rounded = true,
  folderId,
  folders = [],
  onDelete,
  onMove,
  onPreview,
  isPublic = false,
}: {
  asset: CanvasAssetType;
  rounded?: boolean;
  folderId?: string;
  folders?: Folder[];
  onDelete?: (id: string) => void;
  onMove?: (assetId: string, folderId: string) => void;
  onPreview?: (asset: CanvasAssetType) => void;
  isPublic?: boolean;
}) {
  const canvasFolders = folders.filter(
    (f) => f.type === "canvas" && f.id !== folderId
  );
  const radiusClass = rounded ? "rounded-md" : "rounded-none";

  const content =
    asset.assetType === "video" ? (
      <video
        src={asset.url}
        autoPlay
        loop
        muted
        playsInline
        className={`w-full h-full object-cover ${radiusClass}`}
      />
    ) : (
      <Image
        src={asset.url}
        alt={asset.originalFilename || "Asset"}
        width={asset.width ?? 1000}
        height={asset.height ?? 1000}
        loading="eager"
        priority
        className={`w-full h-full object-cover ${radiusClass}`}
      />
    );

  if (isPublic) {
    return (
      <div
        className={`break-inside-avoid mb-3 overflow-hidden ${radiusClass} group cursor-pointer`}
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
          className={`break-inside-avoid mb-3 overflow-hidden ${radiusClass} group cursor-pointer hover:opacity-90 transition-opacity`}
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
            toast.custom(
              () => (
                <div className="flex justify-center mx-auto">
                  <div className="bg-popover text-popover-foreground border border-input/50 rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5">
                    <CircleCheckIcon
                      className="size-3.5 text-green-400 dark:text-green-600"
                      strokeWidth={2.2}
                    />
                    <h1>URL copied to clipboard</h1>
                  </div>
                </div>
              ),
              { position: "top-center" }
            );
          }}
        >
          <CopyIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
          Copy URL
        </ContextMenuItem>
        <ContextMenuSeparator />

        {asset.assetType === "image" && (
          <ContextMenuItem
            className="flex items-center gap-2"
            onClick={async () => {
              try {
                const res = await fetch(asset.url);
                const blob = await res.blob();
                const pngBlob =
                  blob.type === "image/png"
                    ? blob
                    : await new Promise<Blob>((resolve) => {
                        const img = new window.Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          canvas.width = img.naturalWidth;
                          canvas.height = img.naturalHeight;
                          canvas.getContext("2d")!.drawImage(img, 0, 0);
                          canvas.toBlob((b) => resolve(b!), "image/png");
                        };
                        img.src = asset.url;
                      });
                await navigator.clipboard.write([
                  new ClipboardItem({ "image/png": pngBlob }),
                ]);
                toast.custom(
                  () => (
                    <div className="flex justify-center mx-auto">
                      <div className="bg-popover text-popover-foreground border border-input/50 rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5">
                        <CircleCheckIcon
                          className="size-3.5 text-green-400 dark:text-green-600"
                          strokeWidth={2.2}
                        />
                        <h1>Image copied to clipboard</h1>
                      </div>
                    </div>
                  ),
                  { position: "top-center" }
                );
              } catch {
                toast.error("Failed to copy image");
              }
            }}
          >
            <ImageIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
            Copy Image
          </ContextMenuItem>
        )}
        {onMove && canvasFolders.length > 0 && (
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
                {canvasFolders.map((folder, index) => (
                  <div key={folder.id}>
                    <ContextMenuItem
                      onClick={() => onMove(asset.id, folder.id)}
                    >
                      {folder.icon && <span>{folder.icon}</span>}
                      {folder.name}
                    </ContextMenuItem>
                    {index !== canvasFolders.length - 1 && (
                      <ContextMenuSeparator />
                    )}
                  </div>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
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
