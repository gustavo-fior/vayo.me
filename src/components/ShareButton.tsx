import * as Switch from "@radix-ui/react-switch";
import {
  CheckIcon,
  GlobeIcon,
  Link1Icon,
  LockClosedIcon,
  LockOpen1Icon,
} from "@radix-ui/react-icons";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { useState } from "react";
import { currentFolderAtom } from "~/helpers/atoms";
import { api } from "~/utils/api";
import { Separator } from "./Separator";
import { UploadIcon } from "./icons/UploadIcon";

export const ShareButton = () => {
  const [currentFolder, setCurrentFolder] = useAtom(currentFolderAtom);
  const [copied, setCopied] = useState(false);
  const utils = api.useUtils();

  const updateFolder = api.folders.update.useMutation({
    onSuccess: () => {
      void utils.folders.findByUserId.invalidate();
    },
  });

  const handleCopyToClipboard = async () => {
    const url =
      "https://" +
      window.location.hostname +
      "/bookmarks/public/" +
      currentFolder?.id;
    await navigator.clipboard.writeText(url);
  };

  const handleUpdateFolder = () => {
    const updatedShared = !currentFolder?.isShared;

    const updatedFolder = {
      id: String(currentFolder?.id),
      isShared: updatedShared,
      allowDuplicate: Boolean(currentFolder?.allowDuplicate),
      name: String(currentFolder?.name),
      icon: String(currentFolder?.icon),
      createdAt: currentFolder?.createdAt ?? new Date(),
      updatedAt: currentFolder?.updatedAt ?? new Date(),
      userId: String(currentFolder?.userId),
    };

    setCurrentFolder(updatedFolder);

    updateFolder.mutate({
      id: String(currentFolder?.id),
      isShared: updatedShared,
      allowDuplicate: Boolean(currentFolder?.allowDuplicate),
      name: String(currentFolder?.name),
      icon: String(currentFolder?.icon),
    });
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <motion.button
          whileTap={{
            scale: 0.95,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="black:text-white rounded-full  p-2 text-black no-underline  hover:bg-black/20 dark:text-white dark:hover:bg-white/20"
        >
          <div className="flex items-center gap-x-2 align-middle">
            <UploadIcon />
          </div>
        </motion.button>
      </Popover.Trigger>
      {currentFolder?.id && (
        <Popover.Portal>
          <Popover.Content className="z-50 mr-12">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-col gap-3 rounded-md border border-black/10 bg-black/5 p-4 align-middle font-semibold text-black no-underline backdrop-blur-lg dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <div className="flex items-center justify-between gap-2 px-1 align-middle">
                <div className="flex items-center gap-2 align-middle">
                  <GlobeIcon className="h-4 w-4 text-gray-800 dark:text-gray-400" />
                  <p>Share</p>
                </div>
                <span className="relative mr-2 mt-0.5 flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full ${
                      currentFolder?.isShared
                        ? "animate-ping bg-green-500"
                        : "bg-gray-700"
                    }  rounded-full opacity-75 transition duration-200 ease-in-out`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full transition duration-200 ease-in-out ${
                      currentFolder?.isShared ? "bg-green-500" : "bg-gray-700"
                    }`}
                  />
                </span>
              </div>
              <Separator />

              <div className="flex items-center justify-between gap-x-2 px-1 align-middle">
                <div className="flex items-center gap-x-3 align-middle">
                  <AnimatePresence mode="popLayout">
                    {currentFolder?.isShared ? (
                      <motion.div
                        key="allowDuplicate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LockOpen1Icon className="h-4 w-4 text-gray-800 dark:text-gray-400" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="notAllowDuplicate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <LockClosedIcon className="h-4 w-4 text-gray-800 dark:text-gray-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="text-sm font-normal">Public</p>
                </div>
                <Switch.Root
                  defaultChecked={currentFolder?.isShared}
                  onCheckedChange={() => {
                    handleUpdateFolder();
                  }}
                  className="relative inline-flex h-5 w-9 items-center rounded-full bg-black/5 p-0.5 transition-colors focus:outline-none data-[state=checked]:bg-black/60 dark:bg-white/5 dark:data-[state=checked]:bg-white/40"
                >
                  <Switch.Thumb className="inline-block h-4 w-4 transform rounded-full border border-neutral-300 bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 dark:border-neutral-500" />
                </Switch.Root>
              </div>
              <p className="px-1 text-xs font-normal text-gray-800 dark:text-gray-400">
                Here&apos;s your magic link:
              </p>
              <div className="flex items-center gap-2 align-middle">
                <input
                  className={`rounded-md bg-black/10 px-3 py-2 text-sm font-normal no-underline transition duration-200 ease-in-out  dark:bg-white/10 ${
                    !currentFolder?.isShared
                      ? "text-zinc-600/10 dark:text-zinc-600/50"
                      : "text-black dark:text-white"
                  }`}
                  type="text"
                  value={
                    window.location.hostname +
                    "/bookmarks/public/" +
                    currentFolder?.id
                  }
                  readOnly
                />
                <AnimatePresence mode="popLayout">
                  <motion.button
                    whileTap={{
                      scale: 0.95,
                    }}
                    disabled={!currentFolder?.isShared}
                    onClick={() => {
                      setCopied(true);

                      setTimeout(() => {
                        setCopied(false);
                      }, 4000);

                      void handleCopyToClipboard();
                    }}
                    className="rounded-md bg-black/10 px-4 py-2.5 font-semibold text-black no-underline transition ease-in-out hover:bg-black/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    {copied ? (
                      <motion.div
                        key={"copied"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <CheckIcon className="h-4 w-4 text-gray-800 dark:text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={"copy"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Link1Icon
                          className={`h-4 w-4 transition duration-200 ease-in-out ${
                            currentFolder?.isShared
                              ? "text-black dark:text-white"
                              : "text-zinc-600/50"
                          }`}
                        />
                      </motion.div>
                    )}
                  </motion.button>
                </AnimatePresence>
              </div>
            </motion.div>
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
};
