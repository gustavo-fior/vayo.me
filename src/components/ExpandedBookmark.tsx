import { type Bookmark } from "@prisma/client";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { Cross1Icon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import Image from "next/image";
import { itemVariants } from "../helpers/animationVariants";
import { useState } from "react";

export const ExpandedBookmark = ({
  bookmark,
  onRemove,
}: {
  bookmark: Bookmark;
  onRemove?: (id: string) => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovering, setIsHovering] = useState("");

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <motion.li
          variants={itemVariants}
          key={bookmark.id}
          onMouseEnter={() => {
            setIsHovering(bookmark.id);
          }}
          onMouseLeave={() => setIsHovering("")}
          className={`relative border-y-8 border-transparent hover:cursor-pointer`}
          onClick={() => {
            window.open(bookmark.url, "_blank");
          }}
        >
          {isHovering === bookmark.id && (
            <motion.div
              transition={{ duration: 0.35 }}
              layoutId="bookmark"
              className="absolute left-0 top-0 z-0 h-full w-full rounded-lg bg-black/5 dark:bg-white/5"
            />
          )}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={`z-10 flex justify-between rounded-lg py-2 px-3 transition duration-500 ease-in-out`}
          >
            <div className={`flex items-center gap-6 md:w-full`}>
              {bookmark.ogImageUrl &&
              !imageError &&
              bookmark.ogImageUrl !==
                "https://raw.githubusercontent.com/spacedriveapp/.github/main/profile/spacedrive_icon.png" ? (
                <Image
                  src={String(bookmark.ogImageUrl)}
                  alt={bookmark.title}
                  width={320}
                  height={180}
                  className="hidden rounded-md md:block"
                  priority
                  style={{
                    height: "4rem",
                    width: "12rem",
                    objectFit: "cover",
                  }}
                  onError={handleImageError}
                />
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
              <div className="flex flex-col gap-2">
                <p className="md:max-w-lg max-w-xs truncate text-lg font-bold text-black dark:text-white">
                  {bookmark.title}
                </p>
                <div className="flex items-center gap-2 align-middle">
                  {bookmark.faviconUrl ? (
                    <Image
                      src={String(bookmark.faviconUrl)}
                      alt={bookmark.title}
                      width={12}
                      height={12}
                      className="rounded-sm"
                      style={{ height: "0.9rem", width: "0.9rem" }}
                    />
                  ) : (
                    <div
                      className="rounded-sm bg-gradient-to-br from-[#bdbdbd] to-[#ececec] dark:from-[#1a1a1a] dark:to-[#2d2c2c]"
                      style={{ height: "0.9rem", width: "0.9rem" }}
                    />
                  )}
                  <p className="w-72 truncate text-sm text-slate-500 md:w-96 md:max-w-sm">
                    {bookmark.url}
                  </p>
                </div>
              </div>
            </div>
            {onRemove && bookmark.id !== "temp" && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                animate={
                  isHovering
                    ? { opacity: 1, transition: { delay: 0.5 } }
                    : { opacity: 0 }
                }
                exit={{ opacity: 0 }}
                className="z-50 pr-4 font-bold text-slate-500 duration-300 ease-in-out dark:hover:text-white hover:text-black"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent the click event from propagating
                  onRemove ? onRemove(bookmark.id) : null;
                }}
              >
                <Cross1Icon className="h-4 w-4" />
              </motion.button>
            )}
          </motion.div>
        </motion.li>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="rounded-md bg-white/10 px-4 py-2 align-middle text-white no-underline backdrop-blur-lg transition duration-300 ease-in-out hover:cursor-pointer hover:bg-white/20">
          <ContextMenu.Item
            className="dark:text-white text-black outline-none focus:outline-none"
            onClick={() => {
              void navigator.clipboard.writeText(bookmark.url);
            }}
          >
            <p>Copy link</p>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};
