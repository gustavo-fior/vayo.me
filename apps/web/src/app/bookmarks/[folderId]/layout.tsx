import { getFaviconForFolder } from "@/utils/create-folder-favicon";
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ folderId: string }>;
};

type Folder = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  icon: string | null;
  isShared: boolean;
  userId: string;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const folderId = (await params).folderId;

  try {
    // fetch post information
    const folder = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/getPublicFolderById?folderId=${folderId}`
    ).then((res: Response) => {
      return res.json() as Promise<Folder>;
    });

    return {
      title: folder.name,
      description: "Check out these bookmarks!",
      icons: {
        icon: getFaviconForFolder(folder.icon),
        apple: getFaviconForFolder(folder.icon),
        shortcut: getFaviconForFolder(folder.icon),
      },
      openGraph: {
        type: "website",
        title: folder.name,
        description: "Check out these bookmarks!",
        url: `https://vayo.me/bookmarks/${folderId}`,
      },
    };
  } catch (error) {
    console.error(error);

    return {
      title: "VAYØ",
      description: "A home for your most amazing links",
    };
  }
}

export default function Page({ children }: Props) {
  return <>{children}</>;
}
