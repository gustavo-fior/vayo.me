import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

export function HoldToDeleteButton({
  children,
  handleDelete,
  disabled,
  isPending = false,
  pendingText,
}: {
  children: React.ReactNode;
  handleDelete: () => void;
  disabled: boolean;
  isPending?: boolean;
  pendingText?: React.ReactNode;
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
      className="relative group overflow-hidden group px-2 w-full justify-start rounded-sm transition-none hover:bg-destructive/5 dark:hover:bg-destructive/5 hover:text-destructive dark:hover:text-destructive data-[triggered=true]:text-destructive dark:data-[triggered=true]:text-destructive [&_svg]:text-neutral-400 dark:[&_svg]:text-neutral-600 hover:[&_svg]:text-destructive/50 data-[triggered=true]:[&_svg]:text-destructive/50 active:scale-100"
      onMouseDown={startHolding}
      onMouseUp={stopHolding}
      onMouseLeave={stopHolding}
      onTouchStart={startHolding}
      onTouchEnd={stopHolding}
      data-triggered={actionTriggered || isPending}
    >
      <div aria-hidden="true" className="hold-overlay justify-start opacity-30">
        {isPending && pendingText ? pendingText : children}
      </div>
      {isPending && pendingText ? pendingText : children}
    </Button>
  );
}
