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

export const CompactBookmark = ({
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

  const [isHovering, setIsHovering] = useState("");
  const [faviconError, setFaviconError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
          <motion.div className="flex items-center justify-between rounded-2xl p-2 align-middle transition duration-200 ease-out hover:bg-black/5 hover:dark:bg-white/5 sm:p-3">
            <div className="flex w-full flex-row items-center gap-2 align-middle sm:gap-3">
              {bookmark.loading ? (
                <motion.div className="flex min-h-[1.9rem] min-w-[1.9rem] items-center justify-center rounded-lg bg-black/10 p-2 dark:bg-white/10">
                  <Spinner size="sm" />
                </motion.div>
              ) : bookmark.faviconUrl ? (
                <motion.div
                  className="min-h-[1.9rem] min-w-[1.9rem] rounded-lg bg-black/10 p-2 dark:bg-white/10"
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Image
                    src={
                      faviconError ? "/images/logo.png" : bookmark.faviconUrl
                    }
                    alt={bookmark.title}
                    width={12}
                    height={12}
                    sizes="24px"
                    style={{
                      height: "0.9rem",
                      width: "0.9rem",
                      borderRadius: "0.2rem",
                    }}
                    onError={() => {
                      setFaviconError(true);
                    }}
                  />
                </motion.div>
              ) : (
                <div
                  className="rounded-lg bg-gradient-to-br from-[#d2d1d1] to-[#dad7d7] dark:from-[#1a1a1a] dark:to-[#2d2c2c]"
                  style={{ height: "1.9rem", width: "1.9rem" }}
                >
                  <motion.p
                    initial={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full w-full items-center justify-center text-xs font-semibold text-black dark:text-white"
                  >
                    {bookmark.title.charAt(0).toUpperCase()}
                  </motion.p>
                </div>
              )}
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
                    className="w-full bg-transparent font-medium text-black focus:outline-none dark:text-white"
                  />
                </form>
              ) : (
                <motion.p
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`max-w-[24rem] truncate font-medium text-black dark:text-white sm:max-w-[18rem] md:max-w-[20rem] lg:max-w-[22rem] xl:max-w-[24rem]`}
                >
                  {title}
                </motion.p>
              )}
              {!isEditing && (
                <p className="hidden truncate text-sm text-zinc-500 sm:block sm:max-w-[6rem] md:max-w-[8rem] lg:max-w-[18rem]">
                  {bookmark.url}
                </p>
              )}
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
