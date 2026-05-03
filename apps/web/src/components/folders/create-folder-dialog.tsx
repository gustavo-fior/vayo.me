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
import { errorToast } from "@/utils/toast";
import {
  EmojiPicker,
  EmojiPickerFooter,
  EmojiPickerContent,
  EmojiPickerSearch,
} from "../ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Loader2, PlusIcon } from "lucide-react";
import type { FolderRecord } from "@/types/items";

export const CreateFolderDialog = ({
  setSelectedFolder,
  setSelectOpen,
}: {
  setSelectedFolder: (folder: FolderRecord | null) => void;
  setSelectOpen: (open: boolean) => void | null;
}) => {
  const [icon, setIcon] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const createFolder = useMutation(
    trpc.folders.createFolder.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.folders.getFolders.queryOptions());
        setName("");
        setOpen(false);
        setSelectedFolder({ ...data[0], totalItems: 0 });
        setSelectOpen?.(false);
      },
      onError: () => {
        errorToast("Failed to create folder");
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
        <div className="flex items-center gap-2 mb-2">
          <Popover
            onOpenChange={setEmojiPickerOpen}
            open={emojiPickerOpen}
            modal
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="text-lg dark:bg-muted"
              >
                {icon ? (
                  <span className="text-lg mt-[1px]">{icon}</span>
                ) : (
                  <span className="text-muted-foreground/50 font-[250]">
                    🪴
                  </span>
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
                createFolder.mutate({ name, icon });
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
