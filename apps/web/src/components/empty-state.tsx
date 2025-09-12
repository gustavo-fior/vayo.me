import type { LucideIcon } from "lucide-react";
import { Label } from "./ui/label";

export function EmptyState({
  title,
  Icon,
  description,
}: {
  title: string;
  Icon: LucideIcon;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full gap-1">
      <Icon
        className={`size-5 text-muted-foreground fill-muted-foreground ${
          description ? "mb-2" : ""
        }`}
      />
      <Label className={`font-medium text-base`}>{title}</Label>
      {description && (
        <p className="text-muted-foreground/50 text-center text-sm">
          {description}
        </p>
      )}
    </div>
  );
}
