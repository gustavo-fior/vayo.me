import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { BookmarksList } from "~/components/BookmarksList";
import { EmptyState } from "~/components/EmptyState";
import { RectangleSkeleton } from "~/components/RectangleSkeleton";
import { ScrollAreaToTopButton } from "~/components/ScrollAreaToTopButton";
import { ScrollFadeOverlay } from "~/components/ScrollFadeOverlay";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Separator } from "~/components/Separator";
import { ShareLinkButton } from "~/components/ShareLinkButton";
import { SkeletonList } from "~/components/SkeletonList";
import { Spinner } from "~/components/Spinner";
import { ThemeButton } from "~/components/ThemeButton";
import { ViewButton } from "~/components/ViewButton";
import { getFaviconForFolder } from "~/helpers/getFaviconForFolder";
import { api } from "~/utils/api";

type SmallBookmark = {
  id: string;
  url: string;
  title: string;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  createdAt: Date;
};

export default function Bookmarks() {
  const router = useRouter();
  const { folderId } = router.query;
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [bookmarks, setBookmarks] = useState<SmallBookmark[] | null>(null);
  const [viewStyle, setViewStyle] = useState<"expanded" | "compact">("compact");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const bookmarksQuery = api.bookmarks.findByFolderId.useQuery(
    {
      folderId: String(folderId),
      page: currentPage,
    },
    {
      enabled: Boolean(folderId),
      onSuccess: (data) => {
        if (data) {
          setBookmarks((prev) => {
            if (prev) {
              const newBookmarks = data.bookmarks.filter((bookmark) => {
                return !prev.find(
                  (prevBookmark) => prevBookmark.id === bookmark.id
                );
              });

              return [...prev, ...newBookmarks];
            } else {
              return data.bookmarks;
            }
          });
          setTotalBookmarks(data.totalElements);

          setTimeout(() => {
            setIsOpen(true);
          }, 10);
        }
      },
    }
  );

  const folder = api.folders.findById.useQuery(
    {
      id: String(folderId),
    },
    {
      enabled: Boolean(folderId),
    }
  );

  const handleChangeViewStyle = () => {
    setIsOpen(false);

    setTimeout(() => {
      setIsOpen(true);
    }, 10);

    setViewStyle(viewStyle === "compact" ? "expanded" : "compact");
  };

  const handleChangeTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // update page when scroll to bottom
  useEffect(() => {
    const handleScroll = () => {
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const { scrollTop, scrollHeight, clientHeight } = scrollArea;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          if (
            bookmarks?.length !== totalBookmarks &&
            !bookmarksQuery.isLoading
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
  }, [bookmarks?.length, totalBookmarks, bookmarksQuery.isLoading]);

  return (
    <>
      <Head>
        <title>{folder?.data?.name ?? "VAYØ"}</title>
        <link rel="icon" href={getFaviconForFolder(folder.data)} />
        <meta
          name="description"
          content="Looking for cool links? Check out this folder!"
        />
        <meta property="og:title" content={folder?.data?.name ?? "VAYØ"} />
        <meta
          property="og:description"
          content="Looking for cool links? Check out this folder!"
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`https://vayo.me/api/og`} />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="5f36385d-9b15-4127-925b-808fba9d75d3"
        ></script>
      </Head>

      <main className="relative min-h-screen w-full bg-[#e0e0e0] pt-8 dark:bg-[#111111]">
        <div className="flex flex-col items-center">
          <div className="w-full overflow-hidden px-2 sm:w-[30rem] sm:px-4 md:w-[40rem] md:px-0 lg:w-[50rem]">
            <div className="pt-4 md:pt-8">
              <div className="flex flex-col justify-start gap-8 px-4 align-middle font-semibold text-black dark:text-white md:flex-row md:items-center md:justify-between md:gap-0">
                {folder?.isLoading ? (
                  <motion.div
                    key="folderNameLoading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pt-2"
                  >
                    <RectangleSkeleton />
                  </motion.div>
                ) : (
                  <motion.div
                    key="folderNameLoaded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {folder?.data?.isShared ? (
                      <div className="flex gap-3 align-middle">
                        <p className="mb-1 text-2xl">{folder?.data?.icon}</p>
                        <p className="text-2xl">{folder?.data?.name}</p>
                      </div>
                    ) : (
                      <p className="text-2xl">🔒 This folder is private</p>
                    )}
                  </motion.div>
                )}
                {folder?.data?.isShared && (
                  <div className="hidden items-center gap-6 align-middle sm:flex md:gap-2">
                    <motion.div
                      key="viewButtonLoaded"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ViewButton
                        viewStyle={viewStyle}
                        handleChangeViewStyle={handleChangeViewStyle}
                      />
                    </motion.div>
                    <motion.div
                      key="themeButtonLoaded"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ThemeButton
                        theme={theme ?? ""}
                        handleChangeTheme={handleChangeTheme}
                      />
                    </motion.div>
                    <motion.div
                      key="shareLinkButtonLoaded"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ShareLinkButton folderId={folderId as string} />
                    </motion.div>
                  </div>
                )}
              </div>

              <div className={`mx-3 mt-2 md:mt-4`}>
                <Separator />
              </div>

              <div className="relative">
                <ScrollArea.Root className="h-[calc(100vh-8rem)]">
                  <ScrollArea.Viewport
                    ref={scrollAreaRef}
                    className="h-full w-full"
                  >
                    {(folder?.isLoading || bookmarksQuery.isLoading) && (
                      <SkeletonList viewStyle={viewStyle} />
                    )}
                    {folder?.data?.isShared && (
                      <motion.div
                        initial={false}
                        animate={isOpen ? "open" : "closed"}
                      >
                        <motion.ul>
                          {bookmarks && bookmarks.length > 0 && (
                            <BookmarksList
                              bookmarks={bookmarks}
                              showMonths={false}
                              viewStyle={viewStyle}
                              isPrivatePage={false}
                            />
                          )}
                          {bookmarks &&
                            bookmarks.length === 0 &&
                            !folder?.isLoading &&
                            !bookmarksQuery.isLoading && <EmptyState />}
                        </motion.ul>
                      </motion.div>
                    )}
                    <div className="flex justify-center pb-2 pt-4 align-middle">
                      {bookmarksQuery.isFetching &&
                        bookmarks &&
                        bookmarks?.length > 0 &&
                        currentPage > 1 && <Spinner size="md" />}
                    </div>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar
                    className="bg-blackA3 hover:bg-blackA5 flex touch-none select-none p-0.5 transition-colors duration-[160ms] ease-out data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col"
                    orientation="vertical"
                  >
                    <ScrollArea.Thumb className="bg-mauve10 relative flex-1 rounded-[10px] before:absolute before:left-1/2 before:top-1/2 before:h-full before:min-h-[44px] before:w-full before:min-w-[44px] before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']" />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
                <ScrollFadeOverlay position="top" />
                <ScrollFadeOverlay position="bottom" />
                <ScrollAreaToTopButton scrollAreaRef={scrollAreaRef} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
