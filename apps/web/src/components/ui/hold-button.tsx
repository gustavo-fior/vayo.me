import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

export function HoldToDeleteButton({
  children,
  handleDelete,
  disabled,
}: {
  children: React.ReactNode;
  handleDelete: () => void;
  disabled: boolean;
}) {
  const [actionTriggered, setActionTriggered] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startHolding = () => {
    if (disabled) {
      return;
    }

    holdTimeoutRef.current = setTimeout(() => {
      setActionTriggered(true);
      handleDelete();
    }, 2000);
  };

  const stopHolding = () => {
    if (holdTimeoutRef.current && !actionTriggered) {
      clearTimeout(holdTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Button
      disabled={disabled}
      variant="ghost"
      className="relative group overflow-hidden group px-2 w-full justify-start rounded-sm transition-none hover:bg-destructive/5 dark:hover:bg-destructive/5 hover:text-destructive dark:hover:text-destructive [&_svg]:text-neutral-400 dark:[&_svg]:text-neutral-600 hover:[&_svg]:text-destructive/50 active:scale-100"
      onMouseDown={startHolding}
      onMouseUp={stopHolding}
      onMouseLeave={stopHolding}
      onTouchStart={startHolding}
      onTouchEnd={stopHolding}
      data-triggered={actionTriggered}
    >
      <div aria-hidden="true" className="hold-overlay justify-start opacity-30">
        {children}
      </div>
      {children}
    </Button>
  );
}
