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
import { Loader2, PencilIcon } from "lucide-react";
import type { Folder } from "@/app/bookmarks/page";

export const EditFolderDialog = ({
  folder,
  setSelectedFolder,
  setSelectOpen,
}: {
  folder: Folder;
  setSelectedFolder: (folder: Folder | null) => void;
  setSelectOpen: (open: boolean) => void;
}) => {
  const [icon, setIcon] = useState(folder.icon ?? "");
  const [name, setName] = useState(folder.name);
  const [open, setOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const updateFolder = useMutation(
    trpc.folders.updateFolder.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.folders.getFolders.queryOptions());
        setOpen(false);
        setSelectOpen?.(false);
        if (data[0]) {
          setSelectedFolder({ ...folder, name: data[0].name, icon: data[0].icon });
        }
      },
      onError: () => {
        toast.error("Failed to update folder");
      },
    })
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (open) {
          setName(folder.name);
          setIcon(folder.icon ?? "");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex justify-start px-[7px] w-full rounded-sm transition-none active:scale-100"
        >
          <div className="flex items-center gap-2 font-normal">
            <PencilIcon className="size-3.5 stroke-[1.5] text-neutral-400 dark:text-neutral-600" />
            Edit
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 my-4">
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
            disabled={updateFolder.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (name) {
                updateFolder.mutate({ id: folder.id, name, icon });
              }
            }}
            disabled={updateFolder.isPending}
            className="w-24"
          >
            {updateFolder.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
