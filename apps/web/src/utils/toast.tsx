"use client";

import { CircleCheckIcon, CircleXIcon } from "lucide-react";
import { toast } from "sonner";

export function successToast(message: string) {
  toast.custom(
    () => (
      <div className="flex justify-center mx-auto">
        <div className="bg-popover dark:bg-muted text-popover-foreground custom-shadow rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5">
          <CircleCheckIcon
            className="size-3.5 text-green-400 dark:text-green-600"
            strokeWidth={2.2}
          />
          <h1>{message}</h1>
        </div>
      </div>
    ),
    { position: "top-center" }
  );
}

export function errorToast(message: string) {
  toast.custom(
    () => (
      <div className="flex justify-center mx-auto">
        <div className="bg-popover dark:bg-muted text-popover-foreground custom-shadow rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5">
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
}
