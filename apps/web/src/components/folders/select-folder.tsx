"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { CreateFolderDialog } from "./create-folder-dialog";
import { EditFolderDialog } from "./edit-folder-dialog";
import { DeleteFolderButton } from "./delete-folder-button";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { FolderRecord } from "@/types/items";

export const SelectFolder = ({
  selectedFolder,
  setSelectedFolder,
  folders,
  withBackground = false,
}: {
  selectedFolder: FolderRecord | null;
  setSelectedFolder: (folder: FolderRecord | null) => void;
  folders: FolderRecord[];
  withBackground?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if an input field is focused
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      // Check if pressed key is a number from 1-9
      const keyNumber = parseInt(event.key);
      if (keyNumber >= 1 && keyNumber <= 9 && folders) {
        const folderIndex = keyNumber - 1; // Convert to 0-based index
        const targetFolder = folders[folderIndex];

        if (targetFolder) {
          setSelectedFolder(targetFolder);
        }
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyPress);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [folders, setSelectedFolder]);

  if (folders?.length === 0) {
    return <div />;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`w-fit h-9 px-3 py-2 justify-between font-medium select-none ring-0 active:ring-0 focus:ring-0 focus-visible:ring-0 transition-colors duration-200 ${
            withBackground && open
              ? "bg-popover dark:bg-popover custom-shadow"
              : withBackground
              ? "bg-white/90 dark:bg-neutral-900/80 custom-shadow hover:bg-white dark:hover:bg-neutral-900"
              : ""
          }`}
        >
          <div className="flex items-center gap-2">
            {selectedFolder?.icon && <p>{selectedFolder.icon}</p>}
            <p className="font-medium">{selectedFolder?.name}</p>
          </div>
          <ChevronDownIcon className="size-3.5 stroke-[1.5] opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={12} className="min-w-56">
        {folders?.map((folder, index) => (
          <DropdownMenuItem
            key={folder.id}
            onSelect={() => setSelectedFolder(folder)}
            className="cursor-pointer select-none flex items-center h-9 justify-between w-full group"
          >
            <div className="flex items-center gap-2.5">
              {folder.icon && <span className="text-sm">{folder.icon}</span>}
              <span className="text-sm">{folder.name}</span>
            </div>

            <div
              className={`absolute ${
                selectedFolder?.id !== folder.id
                  ? "right-1.5"
                  : "right-[1.9rem]"
              } flex items-center gap-2`}
            >
              {selectedFolder?.id !== folder.id && index < 9 && (
                <span className="flex text-[10px] items-center justify-center bg-muted/50 rounded-[3px] py-[1px] px-1 custom-shadow group-hover:bg-transparent group-hover:border-transparent tabular-nums font-mono">
                  {index + 1}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                {folder.totalItems}
              </span>
            </div>

            {selectedFolder?.id === folder.id && (
              <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <CheckIcon className="size-4 stroke-[1.5]" />
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <CreateFolderDialog
          setSelectedFolder={setSelectedFolder}
          setSelectOpen={setOpen}
        />
        {selectedFolder && (
          <EditFolderDialog
            folder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            setSelectOpen={setOpen}
          />
        )}
        {selectedFolder?.id && (
          <DeleteFolderButton
            folderId={selectedFolder.id}
            setOpen={setOpen}
            folders={folders}
            setSelectedFolder={setSelectedFolder}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
