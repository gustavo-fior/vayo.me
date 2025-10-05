import { toast } from "sonner";
import { CircleCheckIcon } from "lucide-react";

export function toaster(message: string) {
  toast.custom(() => (
    <div className="flex justify-center mx-auto">
      <div className="bg-popover text-popover-foreground border border-border rounded-full px-4 pr-5 py-2 text-sm font-medium flex items-center gap-2">
        <CircleCheckIcon
          className="size-3.5 text-green-400 dark:text-green-600"
          strokeWidth={2.2}
        />
        <h1>{message}</h1>
      </div>
    </div>
  ));
}
