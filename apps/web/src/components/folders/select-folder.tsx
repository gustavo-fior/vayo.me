"use client";

import { useEffect, useState } from "react";
import { CreateFolderDialog } from "./create-folder-dialog";
import { DeleteFolderButton } from "./delete-folder-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { Folder } from "@/app/bookmarks/page";

export const SelectFolder = ({
  selectedFolder,
  setSelectedFolder,
  folders,
}: {
  selectedFolder: Folder | null;
  setSelectedFolder: (folder: Folder | null) => void;
  folders: Folder[];
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
    <Select
      open={open}
      onOpenChange={setOpen}
      value={selectedFolder?.id ?? undefined}
      onValueChange={(value) => {
        const newFolder = folders?.find((folder) => folder.id === value);

        if (newFolder) {
          setSelectedFolder(newFolder);
        }
      }}
    >
      <SelectTrigger className="w-fit transition-colors duration-100 cursor-pointer border-none bg-transparent dark:bg-transparent hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 focus-visible:ring-0 focus-visible:ring-offset-0 select-none shadow-none">
        <SelectValue placeholder="Select a folder" className="select-none ">
          <div className="flex items-center gap-2">
            {selectedFolder?.icon && <p>{selectedFolder.icon}</p>}
            <p className="font-medium">{selectedFolder?.name}</p>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        side="bottom"
        sideOffset={4}
        alignOffset={8}
        className="min-w-40"
      >
        {folders?.map((folder, index) => (
          <SelectItem
            key={folder.id}
            value={folder.id}
            className="cursor-pointer select-none flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2">
              {folder.icon && <span className="text-base">{folder.icon}</span>}
              <span className="text-sm">{folder.name}</span>
            </div>

            {selectedFolder?.id !== folder.id && (
              <span className="absolute right-1.5 flex text-xs items-center justify-center bg-muted/50 rounded-[3px] p-[0.5px] px-1 border border-border/30 group-hover:bg-transparent group-hover:border-transparent">
                {index + 1}
              </span>
            )}
          </SelectItem>
        ))}
        <SelectSeparator />
        <CreateFolderDialog
          setSelectedFolder={setSelectedFolder}
          setSelectOpen={setOpen}
        />
        {selectedFolder?.id && (
          <DeleteFolderButton
            folderId={selectedFolder.id}
            setOpen={setOpen}
            folders={folders}
            setSelectedFolder={setSelectedFolder}
          />
        )}
      </SelectContent>
    </Select>
  );
};
