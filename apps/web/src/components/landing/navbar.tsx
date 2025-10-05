import Link from "next/link";
import { Button } from "../ui/button";
import { toaster } from "@/utils/toaster";
import { ArrowUpRightIcon } from "lucide-react";

export default function Navbar() {
  return (
    <div className="flex items-center p-6 fixed top-0 left-0 right-0 z-50">
      <div className="flex-1">
        <Link href="/">
          <p className="text-2xl font-bold">Lumina AI</p>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => toaster("Home")}>
          Home
        </Button>
        <Button variant="ghost">Sobre</Button>
        <Button variant="ghost">Contact</Button>
      </div>
      <div className="flex-1 flex items-center gap-2 justify-end">
        <Button>
          Agende uma demo{" "}
          <ArrowUpRightIcon className="size-3.5 mt-0.5" strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
