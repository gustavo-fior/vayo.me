import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  EmojiPicker,
  EmojiPickerFooter,
  EmojiPickerContent,
  EmojiPickerSearch,
} from "../ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  BookmarkIcon,
  ImageIcon,
  LayoutPanelLeftIcon,
  Loader2,
  PlusIcon,
} from "lucide-react";
import type { Folder } from "@/app/bookmarks/page";

export const CreateFolderDialog = ({
  setSelectedFolder,
  setSelectOpen,
}: {
  setSelectedFolder: (folder: Folder | null) => void;
  setSelectOpen: (open: boolean) => void | null;
}) => {
  const [icon, setIcon] = useState("");
  const [name, setName] = useState("");
  const [folderType, setFolderType] = useState<"bookmarks" | "canvas">(
    "bookmarks"
  );
  const [open, setOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const createFolder = useMutation(
    trpc.folders.createFolder.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.folders.getFolders.queryOptions());
        setName("");
        setFolderType("bookmarks");
        setOpen(false);
        setSelectedFolder({ ...data[0], totalItems: 0 });
        setSelectOpen?.(false);
      },
      onError: () => {
        toast.error("Failed to create folder");
      },
    })
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        setTimeout(() => {
          setName("");
          setIcon("");
          setFolderType("bookmarks");
        }, 150);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex justify-start px-[7px] w-full rounded-sm transition-none active:scale-100"
        >
          <div className="flex items-center gap-2 font-normal">
            <PlusIcon className="size-4 stroke-[1.5] text-neutral-400 dark:text-neutral-600" />
            New
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 my-2">
          <Button
            type="button"
            variant={"outline"}
            size="sm"
            className={`flex-1 active:scale-100 h-fit py-5 border-input dark:border-input/50 justify-start focus-visible:ring-0 items-start p-4 w-full ${
              folderType === "bookmarks" ? "bg-primary/5 dark:bg-primary/5" : ""
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
            variant={"outline"}
            size="sm"
            className={`flex-1 gap-1.5 active:scale-100 h-fit py-5 border-input dark:border-input/50 justify-start focus-visible:ring-0 items-start p-4 w-full ${
              folderType === "canvas" ? "bg-primary/5 dark:bg-primary/5" : ""
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
        <div className="flex items-center gap-2 mb-4">
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
                  <span className="text-muted-foreground/50 font-[330]">?</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-0" sideOffset={12}>
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

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={createFolder.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (name) {
                createFolder.mutate({ name, icon, type: folderType });
              }
            }}
            disabled={createFolder.isPending}
            className="w-24"
          >
            {createFolder.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
