export function Shortcut({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-[3px] py-[1px] px-1 text-[10px] text-neutral-500 border border-neutral-200/50 dark:border-neutral-700/30">
      {children}
    </div>
  );
}
