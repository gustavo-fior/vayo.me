import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HoldToDeleteButton } from "../ui/hold-button";
import type { Folder } from "@/app/bookmarks/page";

export const DeleteFolderButton = ({
  folderId,
  setOpen,
  folders,
  setSelectedFolder,
}: {
  folderId: string;
  setOpen: (open: boolean) => void;
  folders: Folder[];
  setSelectedFolder: (folder: Folder | null) => void;
}) => {
  const deleteFolder = useMutation(
    trpc.folders.deleteFolder.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.folders.getFolders.queryOptions());
        setOpen(false);

        const filteredFolders = folders.filter(
          (folder) => folder.id !== folderId
        );

        if (filteredFolders.length > 1) {
          setSelectedFolder(filteredFolders[filteredFolders.length - 1]);
        } else if (filteredFolders.length === 1) {
          setSelectedFolder(filteredFolders[0]);
        } else {
          setSelectedFolder(null);
        }
      },
      onError: () => {
        toast.error("Failed to delete folder");
      },
    })
  );

  return (
    <HoldToDeleteButton
      handleDelete={() => deleteFolder.mutate(folderId)}
      disabled={deleteFolder.isPending}
    >
      <div className="flex items-center gap-2 z-10 font-normal">
        <Trash2 className="size-3.5" />
        Delete
      </div>
    </HoldToDeleteButton>
  );
};
