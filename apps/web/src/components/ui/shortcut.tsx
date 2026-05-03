export function Shortcut({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-200/50 dark:bg-neutral-700/30 rounded-[2px] py-[1px] px-1 text-[8px] text-neutral-600 dark:text-neutral-400 custom-shadow font-mono">
      {children}
    </div>
  );
}
