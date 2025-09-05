"use client";

import { GlobeIcon } from "@radix-ui/react-icons";
import { PlusIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useAtom } from "jotai";
import { isNewFolderModalOpenAtom } from "~/helpers/atoms";
import { CreateFolderForm } from "./CreateFolderForm";
import { Hotkey } from "./Hotkey";

export function EmptyState() {
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useAtom(
    isNewFolderModalOpenAtom
  );

  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-neutral-400 px-4 py-10 dark:border-neutral-800 md:min-h-[500px]">
      <div className="h-36 w-full max-w-64 overflow-hidden px-4 [mask-image:linear-gradient(transparent,black_10%,black_90%,transparent)]">
        <motion.div
          className="flex flex-col"
          animate={{
            y: [0, -300],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop",
          }}
        >
          {[...Array(6)].map((_, idx) => (
            <Card key={idx}>
              <div className="flex items-center gap-3">
                <GlobeIcon className="h-5 w-5 text-neutral-600" />
                <div className="flex-1">
                  <div className="h-3 w-24 rounded bg-neutral-300 dark:bg-neutral-700" />
                  <div className="mt-2 h-2 w-32 rounded bg-neutral-300 dark:bg-neutral-800" />
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      </div>

      <div className="max-w-xs text-pretty text-center">
        <span className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          No bookmarks found
        </span>
      </div>

      <Dialog.Root
        open={isNewFolderModalOpen}
        onOpenChange={setIsNewFolderModalOpen}
      >
        <Dialog.Trigger asChild>
          <button className="flex items-center justify-between gap-5 rounded-md bg-black/10 px-2 py-1 align-middle outline-none transition hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20">
            <div className="flex items-center font-medium">
              <PlusIcon className="ml-[0.1rem] h-4 w-4" />
              <span className="ml-3">New folder</span>
            </div>
            <Hotkey key1="n" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md data-[state=open]:animate-overlayShow" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[10000] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-md shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow sm:w-[50vw] md:w-[30vw] lg:w-[25vw]">
            <CreateFolderForm />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/10 p-4 shadow-[0_4px_12px_0_#0000000D] dark:border-neutral-700 dark:bg-neutral-900">
      {children}
    </div>
  );
}
