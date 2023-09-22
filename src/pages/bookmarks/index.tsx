import { type Bookmark } from "@prisma/client";
import { PlusIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { type GetServerSideProps } from "next";
import { getSession, useSession } from "next-auth/react";
import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import { CompactBookmark } from "~/components/CompactBookmark";
import { CreateFolderButton } from "~/components/CreateFolderButton";
import { DeleteFolderButton } from "~/components/DeleteFolderButton";
import { EmptyState } from "~/components/EmptyState";
import { ExpandedBookmark } from "~/components/ExpandedBookmark";
import { FolderSkeleton } from "~/components/FolderSkeleton";
import { Separator } from "~/components/Separator";
import { ShareButton } from "~/components/ShareButton";
import { ProfileMenu } from "~/components/ProfileMenu";
import { SkeletonList } from "~/components/SkeletonList";
import { Spinner } from "~/components/Spinner";
import {
  currentFolderIdAtom,
  directionAtom,
  isOpenAtom,
  viewStyleAtom,
} from "~/helpers/atoms";
import { api } from "~/utils/api";

export default function Bookmarks() {
  const session = useSession();
  const utils = api.useContext();
  const [inputUrl, setInputUrl] = useState("");
  const [isOpen, setIsOpen] = useAtom(isOpenAtom);
  const [viewStyle] = useAtom(viewStyleAtom);
  const [direction] = useAtom(directionAtom);
  const [currentFolderId, setCurrentFolderId] = useAtom(currentFolderIdAtom);

  const { data: folders, isLoading: foldersLoading } =
    api.folders.findByUserId.useQuery(
      { userId: String(session.data?.user.id) },
      {
        onSuccess: (data) => {
          if (data && data?.length > 0 && !currentFolderId) {
            setCurrentFolderId(data[0]?.id ?? "");
          }
        },
      }
    );

  const faviconUrl: string = folders?.find(
    (folder) => folder.id === currentFolderId
  )?.icon
    ? `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${
        folders?.find((folder) => folder.id === currentFolderId)?.icon
      }</text></svg>`
    : "/favicon.ico";

  const { data: bookmarks, isLoading: bookmarksLoading } =
    api.bookmarks.findByFolderId.useQuery({
      folderId: String(currentFolderId),
      direction: direction,
    });

  const addBookmark = api.bookmarks.create.useMutation({
    onMutate: async () => {
      setInputUrl("");

      //optimistic update
      await utils.bookmarks.findByFolderId.cancel();

      const previousBookmarks = utils.bookmarks.findByFolderId.getData();

      utils.bookmarks.findByFolderId.setData(
        { folderId: String(currentFolderId), direction: "asc" },
        (oldQueryData: Bookmark[] | undefined) => {
          const newBookmark: Bookmark = {
            id: "temp",
            url: inputUrl,
            title:
              inputUrl.split("/")[2]?.split(".")[0] === "www"
                ? inputUrl.split("/")[2]?.split(".")[1] ?? ""
                : inputUrl.split("/")[2]?.split(".")[0] ?? "",
            folderId: "temp",
            faviconUrl: null,
            ogImageUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return oldQueryData ? [...oldQueryData, newBookmark] : [newBookmark];
        }
      );

      return { previousBookmarks };
    },

    onSettled: () => {
      void utils.bookmarks.findByFolderId.invalidate();
    },
    onError: (context) => {
      const previousBookmarks =
        (context as { previousBookmarks?: Bookmark[] })?.previousBookmarks ??
        null;

      utils.bookmarks.findByFolderId.setData(
        { folderId: String(currentFolderId), direction: direction },
        previousBookmarks!
      );
    },
  });

  const deleteBookmark = api.bookmarks.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.bookmarks.findByFolderId.cancel();

      const previousBookmarks = utils.bookmarks.findByFolderId.getData();

      utils.bookmarks.findByFolderId.setData(
        { folderId: String(currentFolderId), direction: direction },
        (previousBookmarks: Bookmark[] | undefined) =>
          [
            ...(previousBookmarks?.filter((bookmark) => bookmark.id !== id) ??
              []),
          ] as Bookmark[]
      );

      return { previousBookmarks };
    },

    onSettled: () => {
      void utils.bookmarks.findByFolderId.invalidate();
    },
    onError: (context) => {
      const previousBookmarks =
        (context as { previousBookmarks?: Bookmark[] })?.previousBookmarks ??
        null;

      utils.bookmarks.findByFolderId.setData(
        { folderId: String(currentFolderId), direction: direction },
        previousBookmarks!
      );
    },
  });

  const handleCreateBookmark = useCallback(() => {
    addBookmark.mutate({
      url: inputUrl,
      folderId: String(currentFolderId),
    });
  }, [addBookmark, inputUrl, currentFolderId]);

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      deleteBookmark.mutate({
        id,
      });
    },
    [deleteBookmark]
  );

  // Opening the bookmarks list
  useEffect(() => {
    if (!bookmarksLoading && bookmarks?.length) {
      setIsOpen(true);
    }
  }, [bookmarksLoading, bookmarks, setIsOpen]);

  return (
    <>
      <Head>
        <title>
          {folders?.find((folder) => folder.id === currentFolderId)?.name ??
            "Bookmarks"}
        </title>
        <link rel="icon" href={faviconUrl} />
      </Head>
      <main className="relative min-h-screen w-full bg-gradient-to-br from-[#202020] to-[black]">
        <div className="flex flex-col items-center">
          <div className="w-[20rem] py-16 sm:w-[30rem] md:w-[40rem] lg:w-[50rem]">
            <div className="flex flex-col-reverse items-center justify-between gap-4 px-2 align-middle lg:flex-row lg:gap-0">
              <motion.form
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateBookmark();
                }}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    name="url"
                    id="url"
                    value={inputUrl}
                    disabled={addBookmark.isLoading || !currentFolderId}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-72 rounded-full bg-white/10 px-6 py-2 font-semibold text-white no-underline placeholder-zinc-600 transition duration-300 placeholder:font-normal hover:bg-white/20 md:w-96"
                  />
                  <motion.button
                    whileTap={{
                      scale: 0.8,
                    }}
                    type="submit"
                    disabled={
                      inputUrl.length === 0 ||
                      addBookmark.isLoading ||
                      !currentFolderId
                    }
                    className={`duration-300'hover:bg-white/20 rounded-full bg-white/10 p-3 transition ${
                      inputUrl.length === 0 || addBookmark.isLoading
                        ? "bg-white/5"
                        : null
                    }`}
                  >
                    {addBookmark.isLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <PlusIcon className="h-4 w-4 text-white" />
                    )}
                  </motion.button>
                </div>
              </motion.form>

              <div className="flex items-center gap-2 align-middle">
                <ShareButton folderId={currentFolderId} />
                <ProfileMenu />
              </div>
            </div>

            <Separator height={2} mx={2} my={6} />

            <div className="flex justify-between px-2 pb-4 align-middle">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-x-2 overflow-x-auto "
              >
                {foldersLoading ? (
                  [...Array<number>(3)].map((_, i) => (
                    <FolderSkeleton key={i} />
                  ))
                ) : folders && folders?.length > 0 ? (
                  folders?.map((folder) => (
                    <motion.div
                      whileTap={{
                        scale: 0.8,
                      }}
                      onClick={() => {
                        if (currentFolderId !== folder.id) {
                          setCurrentFolderId(folder.id);
                          setIsOpen(false);
                          void utils.bookmarks.findByFolderId.invalidate();
                        }
                      }}
                      key={folder.id}
                      className={`${
                        currentFolderId === folder.id ? "bg-white/30" : ""
                      } group flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 align-middle font-semibold text-white no-underline transition hover:cursor-pointer hover:bg-white/20`}
                    >
                      {folder.icon && <div>{folder.icon}</div>}
                      <div>{folder.name}</div>
                    </motion.div>
                  ))
                ) : (
                  <p className={`text-center italic text-gray-500`}>
                    No folders yet, create one -{">"}
                  </p>
                )}
              </motion.div>
              <div className="flex gap-2">
                {folders && folders?.length > 0 && (
                  <DeleteFolderButton
                    folderId={currentFolderId}
                    setCurrentFolderId={setCurrentFolderId}
                  />
                )}
                <CreateFolderButton />
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                initial={false}
                animate={isOpen ? "open" : "closed"}
                className="flex flex-col gap-8"
              >
                <motion.ul
                  className={`flex flex-col ${
                    viewStyle === "compact" ? "gap-2" : "gap-6"
                  }`}
                  variants={{
                    open: {
                      transition: {
                        type: "spring",
                        bounce: 0,
                        duration: 0.7,
                        staggerChildren: 0.08,
                        delayChildren: 0.2,
                      },
                    },
                    closed: {
                      transition: {
                        type: "spring",
                        bounce: 0,
                        duration: 0.3,
                      },
                    },
                  }}
                >
                  {bookmarksLoading || foldersLoading ? (
                    <SkeletonList viewStyle={viewStyle} />
                  ) : bookmarks && bookmarks?.length > 0 ? (
                    bookmarks.map((bookmark) => (
                      <div key={bookmark.id}>
                        {viewStyle === "compact" ? (
                          <CompactBookmark
                            onRemove={handleDeleteBookmark}
                            bookmark={bookmark}
                          />
                        ) : (
                          <ExpandedBookmark
                            onRemove={handleDeleteBookmark}
                            bookmark={bookmark}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    bookmarks?.length === 0 && <EmptyState />
                  )}
                </motion.ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
