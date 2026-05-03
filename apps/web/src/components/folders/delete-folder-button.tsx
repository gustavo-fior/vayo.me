import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { errorToast } from "@/utils/toast";
import { HoldToDeleteButton } from "../ui/hold-button";
import type { FolderRecord } from "@/types/items";

export const DeleteFolderButton = ({
  folderId,
  setOpen,
  folders,
  setSelectedFolder,
}: {
  folderId: string;
  setOpen: (open: boolean) => void;
  folders: FolderRecord[];
  setSelectedFolder: (folder: FolderRecord | null) => void;
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
        errorToast("Failed to delete folder");
      },
    })
  );

  return (
    <HoldToDeleteButton
      handleDelete={() => deleteFolder.mutate(folderId)}
      disabled={deleteFolder.isPending}
      isPending={deleteFolder.isPending}
      pendingText={
        <div className="flex items-center gap-[11px] z-10 font-normal">
          <Trash2 className="size-[13px] stroke-[1.5] fill-current/10 dark:fill-current/20" />
          Deleting...
        </div>
      }
    >
      <div className="flex items-center gap-[11px] z-10 font-normal">
        <Trash2 className="size-[13px] stroke-[1.5] fill-current/10 dark:fill-current/20" />
        Delete
      </div>
    </HoldToDeleteButton>
  );
};
