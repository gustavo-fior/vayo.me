import * as Switch from "@radix-ui/react-switch";
import {
  GearIcon,
  HamburgerMenuIcon,
  LightningBoltIcon,
  RowsIcon,
} from "@radix-ui/react-icons";
import * as Popover from "@radix-ui/react-popover";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  currentFolderAtom,
  isOpenAtom,
  showMonthsAtom,
  viewStyleAtom,
} from "~/helpers/atoms";
import { api } from "~/utils/api";
import { Hotkey } from "./Hotkey";
import { Separator } from "./Separator";
import { Spinner } from "./Spinner";
import { SunDimIcon } from "./icons/SunDimIcon";
import { MoonIcon } from "./icons/MoonIcon";
import { LogoutIcon } from "./icons/LogoutIcon";

export const ProfileMenu = () => {
  const session = useSession();
  const [signinOut, setSigninOut] = useState(false);
  const [, setIsOpen] = useAtom(isOpenAtom);
  const { resolvedTheme, setTheme } = useTheme();
  const [viewStyle, setViewStyle] = useAtom(viewStyleAtom);
  const [showMonths, setShowMonths] = useAtom(showMonthsAtom);
  const [currentFolder, setCurrentFolder] = useAtom(currentFolderAtom);

  useHotkeys(
    "t",
    () => {
      handleChangeTheme(resolvedTheme === "light" ? "dark" : "light");
    },
    {
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "d",
    () => {
      handleUpdateFolder();
    },
    {
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "m",
    () => {
      handleUpdateShowMonths();
    },
    {
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "v",
    () => {
      handleChangeViewStyle(viewStyle === "compact" ? "expanded" : "compact");
    },
    {
      enableOnFormTags: false,
    }
  );

  const updateFolder = api.folders.update.useMutation();

  const handleChangeTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
  };

  const handleSignOut = () => {
    setSigninOut(true);
    signOut().catch((err) => console.error(err));
  };

  const handleUpdateFolder = () => {
    const updatedDuplicate = !currentFolder?.allowDuplicate;

    const updatedFolder = {
      id: String(currentFolder?.id),
      isShared: Boolean(currentFolder?.isShared),
      allowDuplicate: updatedDuplicate,
      name: String(currentFolder?.name),
      icon: String(currentFolder?.icon),
      createdAt: currentFolder?.createdAt ?? new Date(),
      updatedAt: currentFolder?.updatedAt ?? new Date(),
      userId: String(currentFolder?.userId),
    };

    setCurrentFolder(updatedFolder);

    updateFolder.mutate({
      id: String(currentFolder?.id),
      allowDuplicate: updatedDuplicate,
      icon: null,
      isShared: null,
      name: null,
    });
  };

  const handleChangeViewStyle = (newViewStyle: "compact" | "expanded") => {
    setIsOpen(false);

    setTimeout(() => {
      setIsOpen(true);
    }, 10);

    setViewStyle(newViewStyle);
  };

  const handleUpdateShowMonths = () => {
    setIsOpen(false);

    setTimeout(() => {
      setIsOpen(true);
    }, 10);

    setShowMonths(!showMonths);
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <motion.button
          whileTap={{
            scale: 0.95,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-full text-black no-underline dark:text-white dark:dark:hover:bg-white/20"
        >
          <div className="flex items-center gap-x-2 align-middle">
            {session.data?.user?.image ? (
              <Image
                src={session.data?.user?.image}
                width={32}
                height={32}
                className="rounded-full"
                alt="Profile Picture"
              />
            ) : (
              <div className="h-6 w-6 rounded-full  bg-black/20 dark:bg-white/20" />
            )}
          </div>
        </motion.button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="z-50 mr-6 md:mr-12">
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex w-64 flex-col gap-3 rounded-md border border-black/10 bg-black/5 p-4 align-middle font-semibold text-black no-underline backdrop-blur-lg dark:border-white/10 dark:bg-white/5 dark:text-white sm:w-80"
          >
            <div className="flex items-center gap-2 px-1 align-middle">
              <div className="flex items-center gap-2 align-middle">
                <GearIcon className="h-4 w-4 text-gray-800 dark:text-gray-400" />
                <p>Settings</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-0.5">
              <div className="flex h-8 items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-normal">View</p>
                  <Hotkey key1="v" />
                </div>
                <ToggleGroup.Root
                  type="single"
                  defaultValue={viewStyle}
                  className="flex h-6 items-center gap-x-1 rounded-md bg-black/5 p-0.5 dark:bg-white/5"
                  onValueChange={(value) => {
                    if (value !== viewStyle && value !== "") {
                      handleChangeViewStyle(value as "compact" | "expanded");
                    }
                  }}
                >
                  <ToggleGroup.Item
                    value="compact"
                    className="flex h-5 w-6 items-center justify-center rounded data-[state=on]:bg-black/20 data-[state=on]:shadow-sm dark:data-[state=on]:bg-white/20"
                  >
                    <HamburgerMenuIcon className="h-3 w-3 text-zinc-700 data-[state=on]:text-zinc-700 dark:text-gray-400 dark:data-[state=on]:text-zinc-700" />
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="expanded"
                    className="flex h-5 w-6 items-center justify-center rounded data-[state=on]:bg-black/20 data-[state=on]:shadow-sm dark:data-[state=on]:bg-white/20"
                  >
                    <RowsIcon className="h-3 w-3 text-zinc-700 data-[state=on]:text-zinc-700 dark:text-gray-400 dark:data-[state=on]:text-zinc-700" />
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>

              <div className="flex h-8 items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-normal">Theme</p>
                  <Hotkey key1="t" />
                </div>
                <ToggleGroup.Root
                  type="single"
                  defaultValue={resolvedTheme}
                  className="flex h-6 items-center gap-x-1 rounded-md bg-black/5 p-0.5 dark:bg-white/5"
                  onValueChange={(value) => {
                    if (value !== resolvedTheme && value !== "") {
                      handleChangeTheme(value as "light" | "dark");
                    }
                  }}
                >
                  <ToggleGroup.Item
                    value="light"
                    className="flex h-5 w-6 items-center justify-center rounded data-[state=on]:bg-black/20 data-[state=on]:shadow-sm dark:data-[state=on]:bg-white/20"
                  >
                    <SunDimIcon size={16} />
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="dark"
                    className="flex h-5 w-6 items-center justify-center rounded data-[state=on]:bg-black/20 data-[state=on]:shadow-sm dark:data-[state=on]:bg-white/20"
                  >
                    <MoonIcon size={16} />
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>

              <div className="flex h-8 items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-normal">Show months?</p>
                  <Hotkey key1="m" />
                </div>
                <Switch.Root
                  defaultChecked={showMonths}
                  onCheckedChange={() => {
                    handleUpdateShowMonths();
                  }}
                  className="relative inline-flex h-5 w-9 items-center rounded-full bg-black/5 p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:bg-white/5 dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500"
                >
                  <Switch.Thumb className="inline-block h-4 w-4 transform rounded-full border border-neutral-300 bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 dark:border-neutral-500" />
                </Switch.Root>
              </div>

              <div className="flex h-8 items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-normal">Allow duplicates?</p>
                  <Hotkey key1="d" />
                </div>
                <Switch.Root
                  defaultChecked={currentFolder?.allowDuplicate}
                  onCheckedChange={() => {
                    handleUpdateFolder();
                  }}
                  className="relative inline-flex h-5 w-9 items-center rounded-full bg-black/5 p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:bg-white/5 dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500"
                >
                  <Switch.Thumb className="inline-block h-4 w-4 transform rounded-full border border-neutral-300 bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 dark:border-neutral-500" />
                </Switch.Root>
              </div>

              <motion.button
                whileTap={{
                  scale: 0.95,
                }}
                disabled={signinOut}
                onClick={handleSignOut}
                className="flex h-8 w-full items-center justify-start gap-2 rounded-md px-2 text-sm font-normal text-black hover:bg-black/20 dark:text-white dark:hover:bg-white/20"
              >
                <LogoutIcon size={16} />
                Sign out
                {signinOut && <Spinner size="sm" />}
              </motion.button>
            </div>
            <Separator />
            <div className="flex items-start gap-2 rounded-md bg-black/5 px-2 py-2 text-xs dark:bg-white/5">
              <LightningBoltIcon className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <p className="text-sm font-normal">Pro tip </p>
              <div className="flex items-center gap-1.5 align-middle">
                <span className="text-sm font-normal text-zinc-500 ">
                  Press
                </span>
                <Hotkey key1="f" />
                <p className="text-sm font-normal text-zinc-500">
                  to open Folders
                </p>
              </div>
            </div>
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
