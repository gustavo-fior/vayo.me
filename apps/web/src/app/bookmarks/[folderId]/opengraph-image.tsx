import { ImageResponse } from "next/og";
import type { Folder } from "../page";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Image metadata
export const alt = "VAYØ";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image({
  params,
}: {
  params: { folderId: string };
}) {
  const folder = await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/getFolderById?folderId=${params.folderId}`
  ).then((res: Response) => {
    return res.json() as Promise<Folder>;
  });

  const geistSemiBold = await readFile(
    join(process.cwd(), "assets/Geist-SemiBold.ttf")
  );

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full items-end justify-end bg-[#171717] relative py-20 px-24">
        <div tw="absolute top-20 right-24 flex items-center justify-center">
          <svg
            width="49"
            height="45"
            viewBox="0 0 49 45"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.5 6.6H19.7V16.2H22.9V22.6H26.1V32.2H29.3V41.8H26.1V45H22.9V41.8H19.7V35.4H16.5V29H13.3V22.6H10.1V13H6.9V6.6H3.7V3.4H0.5V0.199997H19.7V3.4H16.5V6.6ZM32.5 32.2H29.3V25.8H32.5V19.4H35.7V13H38.9V3.4H35.7V0.199997H48.5V3.4H45.3V6.6H42.1V13H38.9V19.4H35.7V25.8H32.5V32.2Z"
              fill="#606060"
              fill-opacity="0.5"
            />
          </svg>
        </div>

        <div tw="flex flex-col w-full">
          <h2 tw="flex flex-col font-semibold tracking-tight text-left">
            <span tw="text-white text-5xl">{folder.icon}</span>
            <span
              tw="text-white mt-8 text-6xl"
              style={{ fontFamily: "Geist", fontWeight: "600" }}
            >
              {folder.name}
            </span>
          </h2>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          data: geistSemiBold,
          style: "normal",
          weight: 600,
        },
      ],
    }
  );
}
