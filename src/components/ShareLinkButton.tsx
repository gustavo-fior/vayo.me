import { Share2Icon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { useState } from "react";
import { UploadIcon } from "./icons/UploadIcon";
import { CheckIcon } from "./icons/CheckIcon";

export const ShareLinkButton = ({ folderId }: { folderId: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    const url =
      "https://" + window.location.hostname + "/bookmarks/public/" + folderId;
    await navigator.clipboard.writeText(url);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <motion.button
      whileTap={{
        scale: 0.95,
      }}
      onClick={() => {
        void handleCopyToClipboard();
      }}
      className="black:text-white rounded-full  p-2 text-black no-underline  hover:bg-black/20 dark:text-white dark:hover:bg-white/20"
    >
      {copied ? (
        <motion.div
          key="copied"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <CheckIcon />
        </motion.div>
      ) : (
        <motion.div
          key="notCopied"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <UploadIcon />
        </motion.div>
      )}
    </motion.button>
  );
};
