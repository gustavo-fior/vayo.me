import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { Calendar, ImageIcon, LogOut, Moon, User } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Shortcut } from "./ui/shortcut";

export default function UserMenu({
  showMonths,
  setShowMonths,
  showOgImage,
  setShowOgImage,
}: {
  showMonths: boolean;
  setShowMonths: (showMonths: boolean) => void;
  showOgImage: boolean;
  setShowOgImage: (showOgImage: boolean) => void;
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
          <div className="flex flex-col">
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
            <LogOut className="size-3.5 text-neutral-500" />
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div
          className="flex items-center justify-between gap-2 p-2 cursor-pointer"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <div className="flex gap-2 items-center">
            <Moon className="size-3.5 text-neutral-500" />
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
        <DropdownMenuSeparator />
        <div
          className="flex items-center justify-between gap-2 p-2 cursor-pointer"
          onClick={() => setShowOgImage(!showOgImage)}
        >
          <div className="flex gap-2 items-center">
            <ImageIcon className="size-3.5 text-neutral-500" />
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
            <Calendar className="size-3.5 text-neutral-500" />
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
