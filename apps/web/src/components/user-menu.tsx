import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import {
  VAYO_CHROME_EXTENSION_STORE_URL,
  canRecommendChromeExtension,
  checkVayoChromeExtensionInstalled,
} from "@/lib/chrome-extension";
import type { FolderView } from "@/types/items";
import {
  ArrowUpRight,
  Calendar,
  Chrome,
  CircleIcon,
  Columns3,
  ExpandIcon,
  LayoutDashboard,
  List,
  LogOut,
  MaximizeIcon,
  Moon,
  PanelsTopLeft,
  Ratio,
  User,
  View,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Shortcut } from "./ui/shortcut";
import { Switch } from "./ui/switch";

const COLUMN_OPTIONS = [2, 3, 4, 5] as const;

export type CanvasControls = {
  viewMode: FolderView;
  setViewMode: (mode: FolderView) => void;
  columns: number;
  setColumns: (n: number) => void;
  fullWidth: boolean;
  setFullWidth: (v: boolean) => void;
  moreSpace: boolean;
  setMoreSpace: (v: boolean) => void;
  rounded: boolean;
  setRounded: (v: boolean) => void;
};

export default function UserMenu({
  showMonths,
  setShowMonths,
  showOgImage,
  setShowOgImage,
  canvasControls,
  withBackground = false,
}: {
  showMonths: boolean;
  setShowMonths: (showMonths: boolean) => void;
  showOgImage: boolean;
  setShowOgImage: (showOgImage: boolean) => void;
  canvasControls?: CanvasControls;
  withBackground?: boolean;
}) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { data: session } = authClient.useSession();
  const [showExtensionInstall, setShowExtensionInstall] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    let isCancelled = false;

    const checkExtensionInstallation = async () => {
      if (!canRecommendChromeExtension()) {
        if (!isCancelled) {
          setShowExtensionInstall(false);
        }
        return;
      }

      const isInstalled = await checkVayoChromeExtensionInstalled();
      if (!isCancelled) {
        setShowExtensionInstall(!isInstalled);
      }
    };

    void checkExtensionInstallation();

    return () => {
      isCancelled = true;
    };
  }, []);

  const viewMode = canvasControls?.viewMode ?? "list";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`select-none ring-0 active:ring-0 focus:ring-0 focus-visible:ring-0 transition-colors duration-200 ${
            withBackground && isOpen
              ? "bg-popover dark:bg-popover custom-shadow"
              : withBackground
              ? "bg-white/90 dark:bg-neutral-900/80 custom-shadow hover:bg-white dark:hover:bg-neutral-900"
              : ""
          }`}
        >
          {session?.user.image ? (
            <Image
              src={session.user.image}
              className="size-6 rounded-full cursor-pointer select-none"
              alt="User"
              width={1080}
              height={1080}
            />
          ) : (
            <User className="size-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-72">
        <div className="flex items-center justify-between pr-1">
          <div className="flex flex-col gap-0.5">
            <DropdownMenuLabel className="pb-0 select-none">
              {session?.user.name}
            </DropdownMenuLabel>
            <DropdownMenuLabel className="pt-0 text-xs font-normal text-neutral-500 select-none">
              {session?.user.email}
            </DropdownMenuLabel>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                  },
                },
              });
            }}
          >
            <LogOut className="size-3.5 stroke-[1.5] text-neutral-500" />
          </Button>
        </div>

        {canvasControls && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <View className="size-3.5 stroke-[1.5] fill-current/10 dark:fill-current/20 text-neutral-500" />
                <Label className="cursor-pointer select-none font-normal">
                  View Mode
                </Label>
              </div>
              <div className="flex gap-1 items-center justify-between">
                <div
                  className="flex items-center justify-center gap-2 cursor-pointer select-none hover:text-accent-foreground text-muted-foreground transition-colors duration-150"
                  onClick={() => canvasControls.setViewMode("list")}
                >
                  <List
                    className={`size-3.5 stroke-[1.5] fill-current/10 dark:fill-current/20 ${
                      viewMode === "list" && "text-accent-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      viewMode === "list" && "text-accent-foreground"
                    }`}
                  >
                    List
                  </span>
                  <Shortcut>L</Shortcut>
                </div>
                <div
                  className="flex items-center justify-center gap-2 cursor-pointer select-none hover:text-accent-foreground text-muted-foreground transition-colors duration-150"
                  onClick={() => canvasControls.setViewMode("grid")}
                >
                  <LayoutDashboard
                    className={`size-3.5 stroke-[1.5] fill-current/10 dark:fill-current/20 ${
                      viewMode === "grid" && "text-accent-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      viewMode === "grid" && "text-accent-foreground"
                    }`}
                  >
                    Grid
                  </span>
                  <Shortcut>G</Shortcut>
                </div>
                <div
                  className="flex items-center justify-center gap-2 cursor-pointer select-none hover:text-accent-foreground text-muted-foreground transition-colors duration-150"
                  onClick={() => canvasControls.setViewMode("canvas")}
                >
                  <Ratio
                    className={`size-3.5 stroke-[1.5] fill-current/5 dark:fill-current/15 ${
                      viewMode === "canvas" && "text-accent-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      viewMode === "canvas" && "text-accent-foreground"
                    }`}
                  >
                    Canvas
                  </span>
                  <Shortcut>C</Shortcut>
                </div>
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <div
          className="flex items-center justify-between gap-2 p-2 cursor-pointer"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <div className="flex items-center gap-2">
            <Moon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
            <Label className="cursor-pointer select-none font-normal">
              Dark Mode
            </Label>
            <Shortcut>T</Shortcut>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
          />
        </div>

        {viewMode !== "canvas" && (
          <>
            <DropdownMenuSeparator />
            <div
              className="flex items-center justify-between gap-2 p-2 cursor-pointer"
              onClick={() => setShowOgImage(!showOgImage)}
            >
              <div className="flex items-center gap-2">
                <PanelsTopLeft className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                <Label className="cursor-pointer select-none font-normal">
                  Show Image
                </Label>
                <Shortcut>V</Shortcut>
              </div>
              <Switch
                checked={showOgImage}
                onCheckedChange={() => setShowOgImage(!showOgImage)}
              />
            </div>
          </>
        )}

        {viewMode === "list" && (
          <>
            <DropdownMenuSeparator />
            <div
              className="flex items-center justify-between gap-2 p-2 cursor-pointer"
              onClick={() => setShowMonths(!showMonths)}
            >
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                <Label className="cursor-pointer select-none font-normal">
                  Show Months
                </Label>
                <Shortcut>M</Shortcut>
              </div>
              <Switch
                checked={showMonths}
                onCheckedChange={() => setShowMonths(!showMonths)}
              />
            </div>
          </>
        )}

        {canvasControls && viewMode === "grid" && (
          <>
            <DropdownMenuSeparator className="hidden md:block" />
            <div
              className="hidden cursor-pointer items-center justify-between gap-2 p-2 md:flex"
              onClick={() =>
                canvasControls.setFullWidth(!canvasControls.fullWidth)
              }
            >
              <div className="flex items-center gap-2">
                <ExpandIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                <Label className="cursor-pointer select-none font-normal">
                  Full Width
                </Label>
                <Shortcut>W</Shortcut>
              </div>
              <Switch
                checked={canvasControls.fullWidth}
                onCheckedChange={canvasControls.setFullWidth}
              />
            </div>

            <DropdownMenuSeparator />
            <div
              className="flex items-center justify-between gap-2 p-2 cursor-pointer"
              onClick={() =>
                canvasControls.setMoreSpace(!canvasControls.moreSpace)
              }
            >
              <div className="flex items-center gap-2">
                <MaximizeIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                <Label className="cursor-pointer select-none font-normal">
                  More Space
                </Label>
                <Shortcut>S</Shortcut>
              </div>
              <Switch
                checked={canvasControls.moreSpace}
                onCheckedChange={canvasControls.setMoreSpace}
              />
            </div>
          </>
        )}

        {canvasControls && viewMode !== "list" && (
          <>
            <DropdownMenuSeparator />
            <div
              className="flex items-center justify-between gap-2 p-2 cursor-pointer"
              onClick={() => canvasControls.setRounded(!canvasControls.rounded)}
            >
              <div className="flex items-center gap-2">
                <CircleIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                <Label className="cursor-pointer select-none font-normal">
                  Rounded
                </Label>
                <Shortcut>R</Shortcut>
              </div>
              <Switch
                checked={canvasControls.rounded}
                onCheckedChange={canvasControls.setRounded}
              />
            </div>
          </>
        )}

        {canvasControls && viewMode === "grid" && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between gap-2 p-2">
              <div className="flex items-center gap-2">
                <Columns3 className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                <Label className="select-none font-normal">Columns</Label>
              </div>
              <div className="flex items-center gap-1">
                {COLUMN_OPTIONS.map((n) => (
                  <Button
                    key={n}
                    variant={
                      canvasControls.columns === n ? "secondary" : "ghost"
                    }
                    size="sm"
                    className="h-5 w-5 rounded px-0 text-xs tabular-nums"
                    onClick={() => canvasControls.setColumns(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {showExtensionInstall && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href={VAYO_CHROME_EXTENSION_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer"
              >
                <Chrome className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
                <span>Install extension</span>
                <ArrowUpRight className="ml-auto size-3.5 text-neutral-500 mr-1" />
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
