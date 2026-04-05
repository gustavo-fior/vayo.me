"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CreateFolderDialog } from "./create-folder-dialog";
import { EditFolderDialog } from "./edit-folder-dialog";
import { DeleteFolderButton } from "./delete-folder-button";
import type { Folder } from "@/app/bookmarks/page";
import { BookmarkIcon, LayoutPanelLeftIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export const SelectFolder = ({
  selectedFolder,
  setSelectedFolder,
  folders,
}: {
  selectedFolder: Folder | null;
  setSelectedFolder: (folder: Folder | null) => void;
  folders: Folder[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
    setExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    leaveTimeout.current = setTimeout(() => {
      setExpanded(false);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      const keyNumber = parseInt(event.key);
      if (keyNumber >= 1 && keyNumber <= 9 && folders) {
        const folderIndex = keyNumber - 1;
        const targetFolder = folders[folderIndex];

        if (targetFolder) {
          setSelectedFolder(targetFolder);
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [folders, setSelectedFolder]);

  if (folders?.length === 0) {
    return <div />;
  }

  const otherFolders = folders?.filter((f) => f.id !== selectedFolder?.id);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative select-none"
    >
      {/* Selected folder - always visible */}
      <div className="flex items-center gap-2 px-3 py-1.5 cursor-default">
        {selectedFolder?.icon && (
          <p className="text-sm">{selectedFolder.icon}</p>
        )}
        <p className="font-medium text-sm">{selectedFolder?.name}</p>
      </div>

      {/* Expandable folder list */}
      <AnimatePresence>
        {expanded && otherFolders.length > 0 && (
          <motion.div
            className="flex flex-col gap-0.5 mt-0.5"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={{
              expanded: {
                transition: {
                  staggerChildren: 0.03,
                },
              },
              collapsed: {
                transition: {
                  staggerChildren: 0.02,
                  staggerDirection: -1,
                },
              },
            }}
          >
            {otherFolders.map((folder, index) => (
              <motion.button
                key={folder.id}
                onClick={() => {
                  setSelectedFolder(folder);
                  setExpanded(false);
                }}
                className="flex items-center justify-between gap-4 px-3 py-1.5 rounded-lg cursor-pointer backdrop-blur-xl bg-white/50 dark:bg-neutral-900/50 border border-white/20 dark:border-white/[0.06] hover:bg-white/70 dark:hover:bg-neutral-800/60 transition-colors duration-100 text-left"
                variants={{
                  expanded: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                  },
                  collapsed: {
                    opacity: 0,
                    y: -8,
                    filter: "blur(4px)",
                  },
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              >
                <div className="flex items-center gap-2">
                  {folder.icon && (
                    <span className="text-sm">{folder.icon}</span>
                  )}
                  <span className="text-sm">{folder.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                    {folder.totalItems}
                  </span>
                  {folder.type === "canvas" ? (
                    <LayoutPanelLeftIcon className="size-2.5 stroke-[1.5] text-muted-foreground/50 fill-current/10 dark:fill-current/20" />
                  ) : (
                    <BookmarkIcon className="size-2.5 stroke-[1.5] text-muted-foreground/50 fill-current/10 dark:fill-current/20" />
                  )}
                  <span className="flex text-[10px] items-center justify-center bg-white/40 dark:bg-white/[0.06] rounded-[3px] py-[1px] px-1 border border-black/[0.04] dark:border-white/[0.06] tabular-nums font-mono">
                    {folders.indexOf(folder) + 1}
                  </span>
                </div>
              </motion.button>
            ))}

            {/* Actions */}
            <motion.div
              className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]"
              variants={{
                expanded: { opacity: 1, y: 0 },
                collapsed: { opacity: 0, y: -4 },
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
            >
              <div className="rounded-lg backdrop-blur-xl bg-white/50 dark:bg-neutral-900/50 border border-white/20 dark:border-white/[0.06]">
                <CreateFolderDialog
                  setSelectedFolder={setSelectedFolder}
                  setSelectOpen={setExpanded}
                />
              </div>
              {selectedFolder && (
                <div className="rounded-lg backdrop-blur-xl bg-white/50 dark:bg-neutral-900/50 border border-white/20 dark:border-white/[0.06]">
                  <EditFolderDialog
                    folder={selectedFolder}
                    setSelectedFolder={setSelectedFolder}
                    setSelectOpen={setExpanded}
                  />
                </div>
              )}
              {selectedFolder?.id && (
                <div className="rounded-lg backdrop-blur-xl bg-white/50 dark:bg-neutral-900/50 border border-white/20 dark:border-white/[0.06]">
                  <DeleteFolderButton
                    folderId={selectedFolder.id}
                    setOpen={setExpanded}
                    folders={folders}
                    setSelectedFolder={setSelectedFolder}
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
