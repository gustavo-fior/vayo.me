"use client";

import { CircleCheckIcon, Undo2Icon } from "lucide-react";

export function UndoToast({
  message,
  onUndo,
}: {
  message: string;
  onUndo: () => void;
}) {
  return (
    <div className="flex justify-center mx-auto">
      <div className="bg-popover dark:bg-muted/50 text-popover-foreground custom-shadow rounded-full px-3 py-2 text-sm font-medium flex items-center gap-1.5">
        <CircleCheckIcon
          className="size-3.5 text-green-400 dark:text-green-600 mr-0.5"
          strokeWidth={2.2}
        />
        <h1 className="leading-none mb-px text-[13px]">{message}</h1>
        <div className="w-px h-[90%] bg-primary/10 ml-1 mr-0.5" />
        <button
          type="button"
          aria-label="Undo"
          onClick={onUndo}
          className="flex size-3.5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <Undo2Icon className="size-3.5 mb-px" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
