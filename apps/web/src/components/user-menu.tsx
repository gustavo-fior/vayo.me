import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import {
  Calendar,
  Columns3,
  CircleIcon,
  ExpandIcon,
  Grid2X2,
  LayoutDashboard,
  LayoutPanelLeftIcon,
  LogOut,
  Maximize,
  MaximizeIcon,
  Moon,
  User,
  VectorSquareIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Shortcut } from "./ui/shortcut";

const COLUMN_OPTIONS = [2, 3, 4, 5] as const;

export type CanvasControls = {
  viewMode: "masonry" | "canvas";
  setViewMode: (mode: "masonry" | "canvas") => void;
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
  isCanvasFolder,
  canvasControls,
}: {
  showMonths: boolean;
  setShowMonths: (showMonths: boolean) => void;
  showOgImage: boolean;
  setShowOgImage: (showOgImage: boolean) => void;
  isCanvasFolder?: boolean;
  canvasControls?: CanvasControls;
}) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { data: session } = authClient.useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="select-none ring-0 active:ring-0 focus:ring-0 focus-visible:ring-0"
        >
          {session?.user.image ? (
            <Image
              src={session?.user.image ?? ""}
              className="rounded-full cursor-pointer select-none"
              alt="User"
              width={24}
              height={24}
            />
          ) : (
            <User className="size-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-64">
        <div className="flex justify-between items-center pr-1">
          <div className="flex flex-col gap-0.5">
            <DropdownMenuLabel className="pb-0 select-none">
              {session?.user.name}
            </DropdownMenuLabel>
            <DropdownMenuLabel className="text-xs text-neutral-500 pt-0 select-none font-normal">
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
        {!canvasControls && <DropdownMenuSeparator />}

        {canvasControls && (
          <>
            <div className="p-2 ">
              <div className="flex gap-1">
                <Button
                  variant={
                    canvasControls.viewMode === "masonry"
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                  className="flex-1 h-8 gap-1.5 rounded-sm active:scale-100"
                  onClick={() => canvasControls.setViewMode("masonry")}
                >
                  <Grid2X2 className="size-3.5 stroke-[1.5] fill-current/10 dark:fill-current/20 text-neutral-500" />
                  <span className="text-xs">Grid</span>
                  <Shortcut>G</Shortcut>
                </Button>
                <Button
                  variant={
                    canvasControls.viewMode === "canvas" ? "secondary" : "ghost"
                  }
                  size="sm"
                  className="flex-1 h-8 gap-1.5 rounded-sm active:scale-100"
                  onClick={() => canvasControls.setViewMode("canvas")}
                >
                  <LayoutDashboard className="size-3.5 stroke-[1.5] fill-current/10 dark:fill-current/20 text-neutral-500" />
                  <span className="text-xs">Canvas</span>
                  <Shortcut>C</Shortcut>
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <div
          className="flex items-center justify-between gap-2 p-2 cursor-pointer"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <div className="flex gap-2 items-center">
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

        {/* Canvas-specific controls */}
        {isCanvasFolder && canvasControls && (
          <>
            {canvasControls.viewMode === "masonry" && (
              <>
                <DropdownMenuSeparator className="hidden md:block" />
                <div
                  className="items-center justify-between gap-2 p-2 cursor-pointer hidden md:flex"
                  onClick={() =>
                    canvasControls.setFullWidth(!canvasControls.fullWidth)
                  }
                >
                  <div className="flex gap-2 items-center">
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
                  <div className="flex gap-2 items-center">
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
                <DropdownMenuSeparator />
                <div
                  className="flex items-center justify-between gap-2 p-2 cursor-pointer"
                  onClick={() =>
                    canvasControls.setRounded(!canvasControls.rounded)
                  }
                >
                  <div className="flex gap-2 items-center">
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
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="flex gap-2 items-center">
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
                        className="h-5 w-5 px-0 text-xs rounded tabular-nums"
                        onClick={() => canvasControls.setColumns(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Bookmark-specific controls */}
        {!isCanvasFolder && (
          <>
            <DropdownMenuSeparator />
            <div
              className="flex items-center justify-between gap-2 p-2 cursor-pointer"
              onClick={() => setShowOgImage(!showOgImage)}
            >
              <div className="flex gap-2 items-center">
                <LayoutPanelLeftIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20" />
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
            <DropdownMenuSeparator />
            <div
              className="flex items-center justify-between gap-2 p-2 cursor-pointer"
              onClick={() => setShowMonths(!showMonths)}
            >
              <div className="flex gap-2 items-center">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
