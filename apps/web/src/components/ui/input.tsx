import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      style={{
        boxShadow:
          "0px 0px 0px 1px rgba(0, 0, 0, 0.06), 0px 1px 2px -1px rgba(0, 0, 0, 0.06), 0px 2px 4px 0px rgba(0, 0, 0, 0.04)",
      }}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/50 selection:bg-primary selection:text-primary-foreground dark:bg-transparent border-transparent dark:border-input/50 flex h-9 w-full min-w-0 rounded-md border bg-background px-3 py-1 text-base transition-all outline-none file:inline-flex file:h-7 file:border-0 duration-200 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring/50 focus-visible:ring-ring/10 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
