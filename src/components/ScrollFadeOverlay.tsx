interface ScrollFadeOverlayProps {
  position: "top" | "bottom";
}

export function ScrollFadeOverlay({ position }: ScrollFadeOverlayProps) {
  const isTop = position === "top";

  return (
    <div
      className={`pointer-events-none absolute left-0 right-0 z-10 h-10 ${
        isTop
          ? "top-0 bg-gradient-to-b from-[#e0e0e0] to-transparent dark:from-[#111111]"
          : "bottom-0 bg-gradient-to-t from-[#e0e0e0] to-transparent dark:from-[#111111]"
      }`}
    />
  );
}
