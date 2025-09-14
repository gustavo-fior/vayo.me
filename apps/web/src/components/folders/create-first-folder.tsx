import type { Folder } from "@/app/bookmarks/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { FolderIcon } from "lucide-react";
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const createFolder = useMutation(
    trpc.folders.createFolder.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.folders.getFolders.queryOptions());
        setName("");
        setSelectedFolder({ ...data[0], totalBookmarks: 0 });
      },
      onError: () => {
        toast.error("Failed to create folder");
      },
    })
  );

  return (
    <div className="flex flex-col min-w-72">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <FolderIcon
          className={`size-5 text-muted-foreground fill-muted-foreground mb-2`}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.2 }}
      >
        <Label className={`font-medium text-lg`}>First Folder</Label>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.4 }}
      >
        <p className="text-muted-foreground/50 text-sm">
          Create your first folder to get started
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.6 }}
      >
        <div className="flex items-center gap-2 mt-6">
          <Popover
            onOpenChange={setEmojiPickerOpen}
            open={emojiPickerOpen}
            modal
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="text-lg">
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
          onClick={() => {
            if (name) {
              createFolder.mutate({ name, icon });
            }
          }}
        >
          Create
        </Button>
      </motion.div>
    </div>
  );
};
