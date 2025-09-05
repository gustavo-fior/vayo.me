import { ArrowUpIcon } from "@radix-ui/react-icons";
import { useEffect, useState, RefObject } from "react";

interface ScrollAreaToTopButtonProps {
  scrollAreaRef: RefObject<HTMLDivElement>;
}

export const ScrollAreaToTopButton = ({
  scrollAreaRef,
}: ScrollAreaToTopButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = () => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const scrollTop = scrollArea.scrollTop;
      setIsVisible(scrollTop > 500);
    }
  };

  const scrollToTop = () => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener("scroll", handleScroll);
      return () => {
        scrollArea.removeEventListener("scroll", handleScroll);
      };
    }
  }, [scrollAreaRef]);

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-[4rem] right-[7rem] hidden rounded-full bg-black/10 p-3 text-black transition duration-300 ease-in-out hover:bg-black/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 lg:block xl:bottom-[6rem] xl:right-[10rem] ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <ArrowUpIcon className="h-4 w-4 text-black dark:text-white" />
    </button>
  );
};
