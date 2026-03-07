import type { Folder } from "@/app/bookmarks/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import {
  BookmarkIcon,
  FolderIcon,
  LayoutPanelLeftIcon,
  Loader2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "../ui/emoji-picker";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { motion } from "motion/react";

export const CreateFirstFolder = ({
  setSelectedFolder,
}: {
  setSelectedFolder: (folder: Folder | null) => void;
}) => {
  const [icon, setIcon] = useState("");
  const [name, setName] = useState("");
  const [folderType, setFolderType] = useState<"bookmarks" | "canvas">(
    "bookmarks"
  );
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const createFolder = useMutation(
    trpc.folders.createFolder.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.folders.getFolders.queryOptions());
        setName("");
        setFolderType("bookmarks");
        setSelectedFolder({ ...data[0], totalItems: 0 });
      },
      onError: () => {
        toast.error("Failed to create folder");
      },
    })
  );

  return (
    <div className="flex flex-col min-w-96">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <FolderIcon
          className={`size-5 text-neutral-400 dark:text-neutral-600 fill-neutral-400 dark:fill-neutral-600 mb-3`}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.2 }}
      >
        <Label className={`font-medium text-base mb-0.5`}>First Folder</Label>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.4 }}
      >
        <p className="text-muted-foreground/50 text-sm font-normal">
          Create your first folder to get started.
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.6 }}
      >
        <div className="grid grid-cols-2 gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`flex-1 active:scale-100 h-fit py-5 border-input/50 dark:border-input/50 justify-start focus-visible:ring-0 items-start p-4 w-full ${
              folderType === "bookmarks"
                ? "bg-primary/5 dark:bg-primary/5 transition-all duration-[150]"
                : ""
            }`}
            onClick={() => setFolderType("bookmarks")}
          >
            <div className="flex flex-col gap-2.5 text-left justify-start items-start w-fit">
              <BookmarkIcon className="size-4 stroke-[1.5] fill-current/10 dark:fill-current/20 text-neutral-500 dark:text-neutral-400" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold">Bookmarks</p>
                <p className="text-xs text-muted-foreground/50 font-normal">
                  Organize your links.
                </p>
              </div>
            </div>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`flex-1 gap-1.5 active:scale-100 h-fit py-5 border-input/50 dark:border-input/50 justify-start focus-visible:ring-0 items-start p-4 w-full ${
              folderType === "canvas"
                ? "bg-primary/5 dark:bg-primary/5 transition-all duration-[150]"
                : ""
            }`}
            onClick={() => setFolderType("canvas")}
          >
            <div className="flex flex-col gap-2.5 text-left justify-start items-start w-full max-w-fit">
              <LayoutPanelLeftIcon className="size-4 stroke-[1.5] fill-current/10 dark:fill-current/20 text-neutral-500 dark:text-neutral-400" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold">Canvas</p>
                <p className="text-xs text-muted-foreground/50 font-normal">
                  Organize your images/videos.
                </p>
              </div>
            </div>
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Popover
            onOpenChange={setEmojiPickerOpen}
            open={emojiPickerOpen}
            modal
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="text-lg dark:border-input/50"
              >
                {icon ? (
                  <span className="text-lg mt-[1px]">{icon}</span>
                ) : (
                  <span className="text-muted-foreground/50 font-normal">
                    ?
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-fit p-0"
              sideOffset={12}
              side="left"
              align="start"
            >
              <EmojiPicker
                className="h-[342px]"
                onEmojiSelect={({ emoji }) => {
                  setEmojiPickerOpen(false);
                  setIcon(emoji);
                }}
              >
                <EmojiPickerSearch />
                <EmojiPickerContent />
                <EmojiPickerFooter />
              </EmojiPicker>
            </PopoverContent>
          </Popover>

          <Input
            type="text"
            placeholder="Folder Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.8 }}
        className="w-full"
      >
        <Button
          className="mt-8 transition-all duration-200 w-full"
          disabled={createFolder.isPending}
          onClick={() => {
            if (name) {
              createFolder.mutate({ name, icon, type: folderType });
            }
          }}
        >
          {createFolder.isPending ? (
            <Loader2Icon className="size-3.5 stroke-[1.5] animate-spin" />
          ) : (
            "Create"
          )}
        </Button>
      </motion.div>
    </div>
  );
};
