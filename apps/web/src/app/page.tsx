"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import localFont from "next/font/local";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

const redaction = localFont({
  src: [
    {
      path: "./fonts/Redaction35-Regular.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Redaction35-Italic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/Redaction35-Bold.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Redaction50-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Redaction50-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/Redaction50-Bold.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Redaction70-Regular.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Redaction70-Italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/Redaction100-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Redaction100-Regular.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/Redaction100-Italic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
});

export default function Home() {
  const [currentFontClass, setCurrentFontClass] = useState("font-normal");
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchTransform, setGlitchTransform] = useState("translate(0px, 0px)");

  const fontWeights = [
    "font-light", // 300 - Redaction35
    "font-normal", // 400 - Redaction50
    "font-medium", // 500 - Redaction70
    "font-bold", // 700 - Redaction100
    "font-black", // 900 - Redaction100-Bold
  ];

  const fontStyles = ["", "italic"];

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);

      // Rapid font changes during glitch
      const glitchDuration = 150 + Math.random() * 300; // 150-450ms
      const changeSpeed = 20 + Math.random() * 30; // 20-50ms between changes

      const glitchTimer = setInterval(() => {
        const randomWeight =
          fontWeights[Math.floor(Math.random() * fontWeights.length)];
        const randomStyle =
          fontStyles[Math.floor(Math.random() * fontStyles.length)];
        setCurrentFontClass(`${randomWeight} ${randomStyle}`.trim());

        // Add random position changes during glitch
        const randomX = (Math.random() - 0.5) * 80; // -4px to +4px
        const randomY = (Math.random() - 0.5) * 40; // -3px to +3px
        setGlitchTransform(`translate(${randomX}px, ${randomY}px)`);
      }, changeSpeed);

      // Stop glitching after duration
      setTimeout(() => {
        clearInterval(glitchTimer);
        setIsGlitching(false);
        // Return to a stable font
        const stableWeight =
          fontWeights[Math.floor(Math.random() * fontWeights.length)];
        setCurrentFontClass(stableWeight);
        // Reset position to center
        setGlitchTransform("translate(0px, 0px)");
      }, glitchDuration);
    }, 4000 + Math.random() * 4000); // Every 4-8 seconds

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className="container mx-auto max-w-md flex h-screen flex-col justify-center md:px-0 px-6">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.2 }}
        className={`${
          redaction.className
        } text-3xl ${currentFontClass} transition-all duration-150 tracking-widest ${
          isGlitching ? "animate-pulse" : ""
        }`}
        style={{ transform: glitchTransform }}
      >
        VAYØ
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.4 }}
        className="text-muted-foreground mt-4"
      >
        A home for your most amazing links. Save and share the most precious
        bits of the internet.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.6 }}
        className="flex items-center mt-6 text-muted-foreground gap-2"
      >
        <p>Check out our</p>
        <Link
          href="https://chromewebstore.google.com/detail/vayo/jaloallboddnknljngplmccchmncogeb"
          className="flex items-center gap-2 cursor-pointer group transition-all duration-200"
          target="_blank"
        >
          <Image
            src="/cws.png"
            alt="Chrome Web Store"
            width={16}
            height={16}
            className="grayscale opacity-50 group-hover:opacity-100 transition-all duration-200 group-hover:grayscale-0 rounded-xs"
          />
          <p className="underline cursor-pointer text-muted-foreground group-hover:text-primary transition-all duration-200">
            Chrome extension.
          </p>
        </Link>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut", delay: 0.8 }}
        className="grid md:grid-cols-2 grid-cols-1 gap-4 items-center mt-8"
      >
        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => {
            authClient.signIn.social({
              provider: "google",
              callbackURL: `${process.env.NEXT_PUBLIC_APP_URL + "/bookmarks"}`,
            });
          }}
        >
          <svg
            width="256"
            height="262"
            viewBox="0 0 256 262"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid"
            className="size-3.5"
          >
            <path
              d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
              fill="#4285F4"
            />
            <path
              d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
              fill="#34A853"
            />
            <path
              d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
              fill="#FBBC05"
            />
            <path
              d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
              fill="#EB4335"
            />
          </svg>
          Sign In with Google
        </Button>

        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => {
            authClient.signIn.social({
              provider: "github",
              callbackURL: `${process.env.NEXT_PUBLIC_APP_URL + "/bookmarks"}`,
            });
          }}
        >
          <svg
            width="1024"
            height="1024"
            viewBox="0 0 1024 1024"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className="size-3.5"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
              transform="scale(64)"
              fill="currentColor"
            />
          </svg>
          Sign In with GitHub
        </Button>
      </motion.div>
    </div>
  );
}
