import * as Dialog from "@radix-ui/react-dialog";
import { CheckIcon, ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { ProfileMenu } from "./ProfileMenu";
import { ShareButton } from "./ShareButton";

import { useAtom } from "jotai";
import { useHotkeys } from "react-hotkeys-hook";
import {
  bookmarksAtom,
  currentFolderAtom,
  currentPageAtom,
  foldersAtom,
  isDeleteFolderModalOpenAtom,
  isNewFolderModalOpenAtom,
  isOpenAtom,
} from "~/helpers/atoms";
import { CreateFolderForm } from "./CreateFolderForm";
import { DeleteFolderForm } from "./DeleteFolderForm";
import { Hotkey } from "./Hotkey";
import { Separator } from "./Separator";
import { PlusIcon } from "./icons/PlusIcon";
import { XIcon } from "./icons/XIcon";

export const Header = ({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
}) => {
  const [folders] = useAtom(foldersAtom);
  const [, setIsOpen] = useAtom(isOpenAtom);
  const [, setBookmarks] = useAtom(bookmarksAtom);
  const [currentFolder, setCurrentFolder] = useAtom(currentFolderAtom);
  const [, setCurrentPage] = useAtom(currentPageAtom);

  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useAtom(
    isNewFolderModalOpenAtom
  );

  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useAtom(
    isDeleteFolderModalOpenAtom
  );

  const [selectOpen, setSelectOpen] = useState(false);

  useHotkeys(
    "f",
    () => {
      setSelectOpen(!selectOpen);
    },
    {
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "n",
    () => {
      setIsNewFolderModalOpen(!isNewFolderModalOpen);
      setIsDeleteFolderModalOpen(false);
    },
    {
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "x",
    () => {
      setIsDeleteFolderModalOpen(!isDeleteFolderModalOpen);
      setIsNewFolderModalOpen(false);
    },
    {
      enableOnFormTags: false,
    }
  );

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if the pressed key is a number and focus is not on an input element
      if (
        !isNaN(parseInt(event.key, 10)) &&
        event.key !== " " &&
        document.activeElement !== inputRef.current &&
        folders
      ) {
        const pressedNumber = parseInt(event.key, 10);
        if (pressedNumber > 0 && pressedNumber <= folders.length) {
          const folder = folders[pressedNumber - 1];
          if (folder && folder.id !== currentFolder?.id) {
            setIsOpen(false);
            setBookmarks(null);
            setCurrentPage(1);
            setSelectOpen(false);
            setCurrentFolder(folder);
            localStorage.setItem("currentFolderId", folder.id);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    currentFolder?.id,
    folders,
    inputRef,
    setCurrentFolder,
    setIsOpen,
    setBookmarks,
    setCurrentPage,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex w-full flex-row items-center justify-between px-8 md:px-12"
    >
      <Select.Root
        open={selectOpen}
        onOpenChange={setSelectOpen}
        onValueChange={(value) => {
          const folder = folders?.find((folder) => folder.id === value);

          if (folder?.id !== currentFolder?.id) {
            setIsOpen(false);
            setBookmarks(null);
            setCurrentPage(1);
            setSelectOpen(false);
            setCurrentFolder(folder ?? null);
          }
        }}
      >
        <Select.Trigger className="text-md inline-flex cursor-pointer items-center justify-between rounded-md focus:outline-none">
          <Select.Value className="flex items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 align-middle"
            >
              {currentFolder?.icon && <div>{currentFolder?.icon}</div>}
              <span className="font-medium">{currentFolder?.name}</span>
            </motion.div>
          </Select.Value>
          {currentFolder && (
            <Select.Icon className="ml-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ChevronDownIcon
                  className={`h-4 w-4 transform text-zinc-500 transition-transform duration-200 ${
                    selectOpen ? "rotate-180" : ""
                  }`}
                />
              </motion.div>
            </Select.Icon>
          )}
        </Select.Trigger>

        <Select.Portal>
          <Select.Content position="popper" sideOffset={10} alignOffset={-10}>
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-black/10 bg-black/5 p-1 align-middle text-sm text-black no-underline backdrop-blur-lg dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <Select.Viewport className="flex flex-col">
                {folders?.map((folder, index) => (
                  <Select.Item
                    key={folder.id}
                    value={folder.id}
                    className={`mb-1 cursor-pointer rounded-md px-3 py-2 align-middle outline-none transition hover:bg-black/20 dark:hover:bg-white/20 ${
                      folder.id === currentFolder?.id
                        ? "bg-black/10 dark:bg-white/10"
                        : ""
                    }`}
                  >
                    <Select.ItemText>
                      <motion.div className="flex items-center justify-between gap-8">
                        <motion.div className="flex items-center gap-2.5 align-middle">
                          {folder?.icon && (
                            <div className="">{folder?.icon}</div>
                          )}
                          <span className="font-medium">
                            {folder?.name}
                            <span className="ml-2 self-center text-xs font-normal text-gray-500">
                              {folder._count?.bookmarks ?? 0}
                            </span>
                          </span>
                        </motion.div>
                        {folder.id === currentFolder?.id ? (
                          <CheckIcon className="mr-0.5 h-4 w-4" />
                        ) : (
                          <Hotkey key1={String(index + 1)} />
                        )}
                      </motion.div>
                    </Select.ItemText>
                  </Select.Item>
                ))}

                <div className="mx-1">
                  <Separator />
                </div>

                {/*CREATE FOLDER MODAL*/}
                <Dialog.Root
                  open={isNewFolderModalOpen}
                  onOpenChange={(change) => {
                    setSelectOpen(false);
                    setIsNewFolderModalOpen(change);
                  }}
                >
                  <Dialog.Trigger asChild>
                    <motion.div className="z-[999] mt-1 cursor-pointer rounded-md py-2 pl-[0.59rem] pr-3 align-middle outline-none transition hover:bg-black/20 dark:hover:bg-white/20">
                      <div
                        onClick={() => setIsNewFolderModalOpen(true)}
                        className="flex items-center justify-between gap-5"
                      >
                        <div className="flex items-center font-medium">
                          <PlusIcon size={16} />
                          <span className="ml-3">New folder</span>
                        </div>
                        <Hotkey key1="n" />
                      </div>
                    </motion.div>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <motion.div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md data-[state=open]:animate-overlayShow">
                      <Dialog.Content className="fixed left-[50%] top-[50%] z-[10000] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-md shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow sm:w-[50vw] md:w-[30vw] lg:w-[25vw]">
                        <CreateFolderForm />
                      </Dialog.Content>
                    </motion.div>
                  </Dialog.Portal>
                </Dialog.Root>

                {/*DELETE FOLDER MODAL*/}
                <Dialog.Root
                  open={isDeleteFolderModalOpen}
                  onOpenChange={(change) => {
                    setSelectOpen(false);
                    setIsDeleteFolderModalOpen(change);
                  }}
                >
                  <Dialog.Trigger asChild>
                    <motion.div className="z-[999] mt-1 cursor-pointer rounded-md py-2 pl-[0.59rem] pr-3 align-middle outline-none transition hover:bg-red-500/20 dark:hover:bg-red-500/20">
                      <div
                        onClick={() => setIsDeleteFolderModalOpen(true)}
                        className="flex items-center justify-between gap-5"
                      >
                        <div className="flex items-center font-medium">
                          <XIcon size={16} className="text-red-500" />
                          <span className="ml-3 text-red-500">Delete</span>
                        </div>
                        <Hotkey red key1="x" />
                      </div>
                    </motion.div>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md data-[state=open]:animate-overlayShow" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] z-[10000] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-md shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow sm:w-[50vw] md:w-[30vw] lg:w-[25vw]">
                      <DeleteFolderForm />
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </Select.Viewport>
            </motion.div>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <div className="flex flex-row items-center justify-between gap-2">
        <ShareButton />
        <ProfileMenu />
      </div>
    </motion.div>
  );
};
