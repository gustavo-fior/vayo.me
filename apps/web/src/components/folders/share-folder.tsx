import type { Folder } from "@/app/bookmarks/page";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import {
  CheckIcon,
  CircleCheck,
  CircleCheckIcon,
  Copy,
  CopyIcon,
  Globe,
  Share,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "../ui/button";
import { DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Switch } from "../ui/switch";

export default function ShareFolder({
  selectedFolder,
  setSelectedFolder,
}: {
  selectedFolder: Folder | null;
  setSelectedFolder: (folder: Folder | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const updateFolderVisibility = useMutation(
    trpc.folders.updateFolderVisibility.mutationOptions()
  );

  if (!selectedFolder) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="select-none ring-0 active:ring-0 focus:ring-0 focus-visible:ring-0"
        >
          <Share />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        alignOffset={-24}
        className="w-72 p-1"
      >
        <div className="flex justify-between items-center pr-3">
          <div className="flex flex-col">
            <DropdownMenuLabel className="pb-0 select-none">
              Visibility
            </DropdownMenuLabel>
            <DropdownMenuLabel className="text-xs text-neutral-500 pt-0 select-none font-normal">
              Make this folder public to everyone.
            </DropdownMenuLabel>
          </div>
        </div>
        <DropdownMenuSeparator />
        <div
          className="flex items-center justify-between p-2 cursor-pointer"
          onClick={() => {
            updateFolderVisibility.mutate({
              id: selectedFolder.id!,
              isShared: !selectedFolder.isShared,
            });

            setSelectedFolder({
              ...selectedFolder,
              isShared: !selectedFolder.isShared,
            });
          }}
        >
          <div className="flex gap-2 items-center">
            <Globe
              className={`size-3.5 transition-colors duration-200 ${
                selectedFolder.isShared
                  ? "text-green-400 dark:text-green-600"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            />
            <Label className="cursor-pointer">Public</Label>
          </div>
          <Switch id="public" checked={selectedFolder.isShared ?? false} />
        </div>
        <AnimatePresence>
          {selectedFolder.isShared && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                marginTop: 4,
                marginBottom: 4,
                transition: { opacity: { delay: 0.2 } },
              }}
              exit={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                transition: {
                  height: { delay: 0.2 },
                  marginTop: { delay: 0.2 },
                  marginBottom: { delay: 0.2 },
                },
              }}
              className="relative px-1"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_APP_URL}/bookmarks/${selectedFolder.id}`
                );
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                }, 2000);
              }}
            >
              <Input
                readOnly
                className={`cursor-pointer rounded-sm px-2.5 select-none text-muted-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-input/30 focus-visible:border-input/30 ${
                  copied
                    ? "border-green-200 dark:border-green-900"
                    : "border-input/30 focus-visible:border-input/30"
                }`}
                value={`${process.env.NEXT_PUBLIC_APP_URL?.replace(
                  /^https?:\/\//,
                  ""
                )}/bookmarks/${selectedFolder.id}`}
              />
              <div className="bg-gradient-to-r from-transparent via-popover/60 to-popover rounded-sm p-1 absolute right-8 top-1 h-7 w-32 cursor-pointer" />
              <div className="bg-popover rounded-sm p-1 absolute right-2 top-1 h-7 w-6 cursor-pointer" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={copied ? "check" : "copy"}
                    initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                    transition={{
                      type: "spring",
                      duration: 0.3,
                      bounce: 0,
                    }}
                  >
                    {copied ? (
                      <CircleCheckIcon className="size-3.5 text-green-400 dark:text-green-600" />
                    ) : (
                      <CopyIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
