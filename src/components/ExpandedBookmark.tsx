import { type Bookmark } from "@prisma/client";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";
import { itemVariants } from "../helpers/animationVariants";
import { ContextMenuContent } from "./ContextMenuContent";
import { Spinner } from "./Spinner";
import { XIcon } from "./icons/XIcon";

export const ExpandedBookmark = ({
  bookmark,
  onRemove,
  isPrivatePage,
}: {
  bookmark: {
    createdAt: Date;
    id: string;
    title: string;
    url: string;
    faviconUrl: string | null;
    ogImageUrl: string | null;
    loading?: boolean;
    onClick?: () => void;
  };
  onRemove?: (id: string) => void;
  isPrivatePage: boolean;
}) => {
  const utils = api.useUtils();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState("");
  const [title, setTitle] = useState(bookmark.title);

  const renameBookmark = api.bookmarks.rename.useMutation({
    onMutate: () => {
      setIsEditing(false);

      return bookmark.title;
    },
    onError: async () => {
      await utils.bookmarks.findByFolderId.refetch();
    },
  });

  useEffect(() => {
    console.log("isEditing changed to", isEditing);

    if (isEditing) {
      const inputElement = inputRef.current;
      if (inputElement) {
        setTimeout(() => {
          inputElement.focus();
        }, 0);
      }
    }
  }, [isEditing]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <motion.li
          variants={itemVariants}
          key={bookmark.id}
          onHoverStart={() => {
            setIsHovering(bookmark.id);
          }}
          onHoverEnd={() => {
            setIsHovering("");
          }}
          className="hover:cursor-pointer"
          onClick={() => {
            if (isEditing) return;

            if (bookmark.onClick) {
              bookmark.onClick();
              return;
            }

            window.open(bookmark.url, "_blank");
          }}
        >
          <motion.div className="flex items-center justify-between rounded-2xl p-3 align-middle transition duration-200 ease-out hover:bg-black/5 hover:dark:bg-white/5">
            <div className="flex w-full flex-row items-center gap-5 align-middle">
              {bookmark.loading ? (
                <motion.div className="min-h-[1.9rem] min-w-[1.9rem] rounded-lg bg-black/10 p-2 dark:bg-white/10">
                  <Spinner size="md" />
                </motion.div>
              ) : bookmark.ogImageUrl && !imageError ? (
                <motion.div
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="hidden md:block"
                >
                  <Image
                    priority
                    src={String(bookmark.ogImageUrl)}
                    alt={bookmark.title}
                    width={320}
                    height={180}
                    className="rounded-md"
                    style={{
                      height: "4rem",
                      width: "12rem",
                      objectFit: "cover",
                    }}
                    onError={() => {
                      setImageError(true);
                    }}
                  />
                </motion.div>
              ) : bookmark.id !== "temp" ? (
                <div
                  className="hidden rounded-md bg-gradient-to-br from-[#e0e0e0] to-[#dad7d7] dark:from-[#1a1a1a] dark:to-[#2d2c2c] md:block"
                  style={{
                    height: "4rem",
                    width: "12rem",
                  }}
                />
              ) : (
                <div
                  className="trasition hidden animate-pulse rounded-md bg-gradient-to-br from-[#bdbdbd] to-[#ececec] duration-100 ease-in-out dark:from-[#1a1a1a] dark:to-[#2d2c2c] md:block"
                  style={{
                    height: "4rem",
                    width: "12rem",
                  }}
                />
              )}
              <div className="flex flex-col gap-2 sm:pl-2 md:pl-0">
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();

                      if (title.length === 0) {
                        return;
                      }

                      renameBookmark.mutate({
                        id: bookmark.id,
                        title,
                      });
                    }}
                    className="w-full"
                  >
                    <motion.input
                      type="text"
                      ref={inputRef}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                      }}
                      onBlur={() => {
                        setIsEditing(false);

                        if (title.length === 0) {
                          setTitle(bookmark.title);

                          return;
                        }

                        renameBookmark.mutate({
                          id: bookmark.id,
                          title,
                        });
                      }}
                      className="w-full bg-transparent text-lg font-medium text-black focus:outline-none dark:text-white"
                    />
                  </form>
                ) : (
                  <motion.p
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`max-w-[20rem] truncate text-lg font-medium text-black dark:text-white sm:max-w-[24rem] md:max-w-[24rem] lg:max-w-[30rem]`}
                  >
                    {title}
                  </motion.p>
                )}
                <div className="flex items-center gap-2 align-middle">
                  {bookmark.faviconUrl ? (
                    <Image
                      src={
                        faviconError ? "/images/logo.png" : bookmark.faviconUrl
                      }
                      alt={bookmark.title}
                      width={12}
                      height={12}
                      className="rounded-sm"
                      style={{ height: "0.9rem", width: "0.9rem" }}
                      sizes="(max-width: 320px) 100vw, 48px"
                      priority
                      onError={() => {
                        setFaviconError(true);
                      }}
                    />
                  ) : (
                    <div
                      className="rounded-sm bg-gradient-to-br from-[#bdbdbd] to-[#ececec] dark:from-[#1a1a1a] dark:to-[#2d2c2c]"
                      style={{ height: "0.9rem", width: "0.9rem" }}
                    />
                  )}
                  <p className="w-48 truncate text-sm text-zinc-500 sm:w-72 md:w-96 md:max-w-sm">
                    {bookmark.url}
                  </p>
                </div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              animate={{
                opacity:
                  isHovering && onRemove && bookmark.id !== "temp" && !isEditing
                    ? 1
                    : 0,
              }}
              exit={{ opacity: 0 }}
              className="z-50 pr-2 font-bold text-zinc-500 duration-300 ease-in-out hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onRemove ? onRemove(bookmark.id) : null;
              }}
            >
              <XIcon size={22} />
            </motion.button>
          </motion.div>
        </motion.li>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenuContent
          bookmark={bookmark as Bookmark}
          setIsEditing={setIsEditing}
          isPrivatePage={isPrivatePage}
        />
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};
