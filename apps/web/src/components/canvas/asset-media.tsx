"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { CanvasAssetType } from "./asset-card";

export function AssetMedia({
  asset,
  rounded = true,
  className,
  mediaClassName,
  sizes = "100vw",
  onDimensions,
}: {
  asset: CanvasAssetType;
  rounded?: boolean;
  className?: string;
  mediaClassName?: string;
  sizes?: string;
  onDimensions?: (dimensions: { width: number; height: number }) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const radiusClass = rounded ? "rounded-md" : "rounded-none";

  useEffect(() => {
    setIsLoaded(false);
  }, [asset.id, asset.url, asset.updatedAt]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-accent/20",
        radiusClass,
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 z-0 h-full w-full bg-accent/70 transition-opacity duration-200",
          radiusClass,
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      />

      {asset.assetType === "video" ? (
        <video
          src={asset.url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            onDimensions?.({
              width: event.currentTarget.videoWidth,
              height: event.currentTarget.videoHeight,
            });
            setIsLoaded(true);
          }}
          onError={() => setIsLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-200",
            radiusClass,
            isLoaded ? "opacity-100" : "opacity-0",
            mediaClassName
          )}
        />
      ) : (
        <Image
          src={asset.url}
          alt={asset.originalFilename || "Asset"}
          fill
          sizes={sizes}
          onLoad={(event) => {
            onDimensions?.({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
            setIsLoaded(true);
          }}
          onError={() => setIsLoaded(true)}
          className={cn(
            "object-cover transition-opacity duration-200",
            radiusClass,
            isLoaded ? "opacity-100" : "opacity-0",
            mediaClassName
          )}
          unoptimized
        />
      )}
    </div>
  );
}
