import { type Bookmark } from "@prisma/client";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { type GetServerSideProps } from "next";
import { getSession, useSession } from "next-auth/react";
import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookmarksList } from "~/components/BookmarksList";
import { CreateFirstFolder } from "~/components/CreateFirstFolder";
import { EmptyState } from "~/components/EmptyState";
import { Header } from "~/components/Header";
import { Separator } from "~/components/Separator";
import { SkeletonList } from "~/components/SkeletonList";
import { Spinner } from "~/components/Spinner";
import { ScrollAreaToTopButton } from "~/components/ScrollAreaToTopButton";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  bookmarksAtom,
  bookmarksFilteredAtom,
  currentFolderAtom,
  currentPageAtom,
  foldersAtom,
  showMonthsAtom,
  totalBookmarksAtom,
  viewStyleAtom,
} from "~/helpers/atoms";
import { capitalizeFirstLetter } from "~/helpers/capitalizeFirstLetter";
import { getCommonFavicons, getWebsiteName } from "~/helpers/getCommonFavicons";
import { getFaviconForFolder } from "~/helpers/getFaviconForFolder";
import { isValidURL } from "~/helpers/isValidURL";
import { useDebounce } from "~/hooks/useDebounce";
import { api } from "~/utils/api";

export default function Bookmarks() {
  const session = useSession();
  const utils = api.useUtils();

  const [inputUrl, setInputUrl] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const inputUrlDebounced = useDebounce(inputUrl, 50);

  const inputRef = useRef(null);

  const [filteredBookmarks, setFilteredBookmarks] = useAtom(
    bookmarksFilteredAtom
  );
  const [bookmarks, setBookmarks] = useAtom(bookmarksAtom);
  const [totalBookmarks, setTotalBookmarks] = useAtom(totalBookmarksAtom);
  const [, setFolders] = useAtom(foldersAtom);
  const [currentFolder, setCurrentFolder] = useAtom(currentFolderAtom);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const [viewStyle] = useAtom(viewStyleAtom);
  const [showMonths] = useAtom(showMonthsAtom);

  const [folders] = useAtom(foldersAtom);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const fetchFolders = api.folders.findByUserId.useQuery(
    {
      userId: String(session.data?.user.id),
    },
    {
      enabled: !!session.data?.user.id,
      onSuccess: (data) => {
        if (data && data?.length > 0) {
          setFolders(data);

          if (!currentFolder) {
            setCurrentFolder(data[0] ?? null);
            setBookmarks(data[0]?.bookmarks ?? null);
          }
        }
      },
    }
  );

  const fetchBookmarsWithSearch = api.bookmarks.findByFolderId.useQuery(
    {
      folderId: String(currentFolder?.id),
      search: inputUrlDebounced,
    },
    {
      enabled: !!currentFolder && inputUrlDebounced.length > 0,
      onSuccess: (data) => {
        if (data?.bookmarks) {
          setFilteredBookmarks(data.bookmarks);
          setTotalBookmarks(data.bookmarks.length);
        }
      },
    }
  );

  const fetchBookmarks = api.bookmarks.findByFolderId.useQuery(
    {
      folderId: String(currentFolder?.id),
      page: currentPage,
    },
    {
      enabled: !!currentFolder,
      onSuccess: (data) => {
        if (data?.bookmarks) {
          setBookmarks((prevBookmarks) => {
            const newBookmarks = data.bookmarks.filter((bookmark) => {
              return !prevBookmarks?.find(
                (prevBookmark) => prevBookmark.id === bookmark.id
              );
            });

            setTotalBookmarks(data.totalElements);

            return prevBookmarks
              ? [...prevBookmarks, ...newBookmarks]
              : [...newBookmarks];
          });
        }
      },
    }
  );

  const addBookmark = api.bookmarks.create.useMutation({
    onMutate: () => {
      setInputUrl("");

      const newBookmark: Bookmark = {
        id: "temp",
        url: inputUrl,
        title: capitalizeFirstLetter(getWebsiteName(inputUrl)),
        folderId: String(currentFolder?.id),
        faviconUrl: getCommonFavicons(inputUrl),
        ogImageUrl: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      bookmarks?.unshift(newBookmark);
      setTotalBookmarks((prevTotal) => (prevTotal ? prevTotal + 1 : 1));
    },
    onSuccess: (data) => {
      const previousPage = currentPage;

      setCurrentPage(1);

      let bookmarkToBeUpdated;

      // update the bookmarks with result
      if (filteredBookmarks && filteredBookmarks.length > 0) {
        bookmarkToBeUpdated = filteredBookmarks
          .filter((bookmark) => bookmark.url === data.url)
          .at(0);
      } else {
        bookmarkToBeUpdated = bookmarks
          ?.filter((bookmark) => bookmark.url === data.url)
          .at(0);
      }

      if (bookmarkToBeUpdated) {
        bookmarkToBeUpdated.id = data.id;
        bookmarkToBeUpdated.faviconUrl = data.faviconUrl;
        bookmarkToBeUpdated.ogImageUrl = data.ogImageUrl;
        bookmarkToBeUpdated.title = data.title;
        bookmarkToBeUpdated.createdAt = data.createdAt;
      }

      setCurrentPage(previousPage);
    },
    onError: (context) => {
      const previousBookmarks =
        (
          context as {
            previousBookmarks?: {
              bookmarks: Bookmark[];
              totalElements: number;
            };
          }
        )?.previousBookmarks ?? null;

      utils.bookmarks.findByFolderId.setData(
        { folderId: String(currentFolder?.id) },
        previousBookmarks!
      );
    },
  });

  const deleteBookmark = api.bookmarks.delete.useMutation({
    onMutate: ({ id }) => {
      if (filteredBookmarks && filteredBookmarks.length > 0) {
        const listWithoutDeletedBookmark = filteredBookmarks.filter(
          (bookmark) => bookmark.id !== id
        );

        if (listWithoutDeletedBookmark) {
          setFilteredBookmarks(listWithoutDeletedBookmark);
          setTotalBookmarks((prevTotal) => (prevTotal ? prevTotal - 1 : 0));
        }
      }

      const listWithoutDeletedBookmark = bookmarks?.filter(
        (bookmark) => bookmark.id !== id
      );

      if (listWithoutDeletedBookmark) {
        setBookmarks(listWithoutDeletedBookmark);
        setTotalBookmarks((prevTotal) => (prevTotal ? prevTotal - 1 : 0));
      }
    },
    onError: (context) => {
      const previousBookmarks =
        (
          context as {
            previousBookmarks?: {
              bookmarks: Bookmark[];
              totalElements: number;
            };
          }
        )?.previousBookmarks ?? null;

      utils.bookmarks.findByFolderId.setData(
        { folderId: String(currentFolder?.id) },
        previousBookmarks!
      );
    },
  });

  const handleCreateBookmark = useCallback(
    (url?: string) => {
      addBookmark.mutate({
        url: url ?? inputUrl,
        folderId: String(currentFolder?.id),
      });
    },
    [addBookmark, inputUrl, currentFolder?.id]
  );

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      deleteBookmark.mutate({
        id,
      });
    },
    [deleteBookmark]
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const { scrollTop, scrollHeight, clientHeight } = scrollArea;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          if (
            bookmarks?.length !== totalBookmarks &&
            !fetchBookmarks.isFetching
          ) {
            setCurrentPage((prevPage) => prevPage + 1);
          }
        }
      }
    };

    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener("scroll", handleScroll);
      return () => {
        scrollArea.removeEventListener("scroll", handleScroll);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks?.length, totalBookmarks, fetchBookmarks.isFetching]);

  // focus on input when ctrl/cmd + f
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();

        if (inputRef.current) {
          (inputRef.current as HTMLFormElement).focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  // filter bookmarks by search query
  useEffect(() => {
    // only filter if there is a search query and if the search query is not a url
    if (inputUrl.length > 0) {
      const filteredBookmarks = bookmarks?.filter((bookmark) => {
        return (
          bookmark.title.toLowerCase().includes(inputUrl.toLowerCase()) ||
          bookmark.url.toLowerCase().includes(inputUrl.toLowerCase())
        );
      });

      setFilteredBookmarks(filteredBookmarks ?? []);
      setTotalBookmarks(filteredBookmarks?.length ?? 0);
    } else {
      setFilteredBookmarks(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputUrl]);

  return (
    <>
      <Head>
        <title>{currentFolder?.name ?? "VAYØ"}</title>
        <link rel="icon" href={getFaviconForFolder(currentFolder)} />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="5f36385d-9b15-4127-925b-808fba9d75d3"
        ></script>
      </Head>
      <main className="relative min-h-screen w-full bg-[#e0e0e0] pt-8 dark:bg-[#111111]">
        <Header inputRef={inputRef} />
        <div className="flex flex-col items-center">
          <div className="w-full px-2 sm:px-4 sm:w-[40rem] md:w-[48rem] md:px-0 lg:w-[50rem] overflow-hidden">
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative mx-2.5 mt-6 md:mx-12 md:mt-8"
              onSubmit={(e) => {
                e.preventDefault();

                if (
                  inputUrl.length === 0 ||
                  addBookmark.isLoading ||
                  !currentFolder
                ) {
                  return;
                }

                if (
                  !currentFolder?.allowDuplicate &&
                  bookmarks?.find((bookmark) => bookmark.url === inputUrl)
                ) {
                  setIsDuplicate(true);

                  setTimeout(() => {
                    setIsDuplicate(false);
                  }, 2000);

                  return;
                }

                handleCreateBookmark();
              }}
            >
              <input
                type="url"
                name="url"
                id="url"
                ref={inputRef}
                value={isDuplicate ? "Duplicate" : inputUrl}
                disabled={addBookmark.isLoading || !currentFolder}
                onChange={(e) => setInputUrl(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text/plain");

                  if (
                    text.length === 0 ||
                    inputUrl.length > 0 ||
                    !isValidURL(text) ||
                    addBookmark.isLoading
                  ) {
                    return;
                  }

                  setInputUrl(text);

                  if (
                    !currentFolder?.allowDuplicate &&
                    bookmarks?.find((bookmark) => bookmark.url === text)
                  ) {
                    setIsDuplicate(true);

                    setTimeout(() => {
                      setInputUrl(text);

                      setIsDuplicate(false);
                    }, 2000);

                    return;
                  }

                  handleCreateBookmark(text);
                }}
                placeholder="https://... or ⌘F"
                className={`w-full rounded-lg border border-black/10 bg-black/10 px-4 py-2 font-normal text-black no-underline placeholder-zinc-600 transition duration-200 ease-in-out placeholder:font-normal hover:bg-black/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 
                  ${
                    isDuplicate
                      ? "animate-shake ring-2 ring-red-500 focus:outline-none focus:ring-red-500"
                      : "outline-zinc-500 focus:outline-none focus:ring-zinc-500"
                  }`}
              />
              {(addBookmark.isLoading ||
                !currentFolder ||
                fetchBookmarsWithSearch.isFetching) &&
                folders &&
                folders?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5, transition: { delay: 1 } }}
                    exit={{ opacity: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transform"
                  >
                    <Spinner size="md" />
                  </motion.div>
                )}
            </motion.form>

            <div className={`mx-3 mt-6`}>
              <Separator />
            </div>

            <ScrollArea.Root className="h-[calc(100vh-200px)] overflow-hidden">
              <ScrollArea.Viewport
                ref={scrollAreaRef}
                className="h-full w-full rounded"
              >
                <motion.ul>
                  {!bookmarks && fetchBookmarks.isFetching && (
                    <SkeletonList viewStyle={viewStyle} />
                  )}

                  {bookmarks && bookmarks?.length > 0 && (
                    <BookmarksList
                      showMonths={showMonths}
                      viewStyle={viewStyle}
                      bookmarks={filteredBookmarks ?? bookmarks}
                      handleDeleteBookmark={handleDeleteBookmark}
                      isPrivatePage
                    />
                  )}

                  {(!folders || folders.length === 0) &&
                    fetchFolders.isFetched &&
                    !fetchFolders.isFetching && <CreateFirstFolder />}

                  {totalBookmarks === 0 &&
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    ((bookmarks && bookmarks.length === 0) ||
                      (filteredBookmarks && filteredBookmarks.length === 0)) &&
                    fetchBookmarks.isFetched &&
                    fetchFolders.isFetched &&
                    !isDuplicate &&
                    folders &&
                    folders?.length > 0 &&
                    (!fetchBookmarsWithSearch.isFetching ||
                      inputUrl.length === 0) &&
                    !addBookmark.isLoading && <EmptyState />}
                </motion.ul>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                className="bg-blackA3 hover:bg-blackA5 flex touch-none select-none p-0.5 transition-colors duration-[160ms] ease-out data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col"
                orientation="vertical"
              >
                <ScrollArea.Thumb className="bg-mauve10 relative flex-1 rounded-[10px] before:absolute before:left-1/2 before:top-1/2 before:h-full before:min-h-[44px] before:w-full before:min-w-[44px] before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
            <div className="flex justify-center pt-10 align-middle">
              {fetchBookmarks.isFetching &&
                bookmarks &&
                bookmarks?.length > 0 &&
                inputUrl.length === 0 &&
                currentPage > 1 && <Spinner size="md" />}
            </div>
            <ScrollAreaToTopButton scrollAreaRef={scrollAreaRef} />
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
