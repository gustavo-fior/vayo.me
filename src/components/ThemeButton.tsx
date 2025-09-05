import { SunIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { MoonIcon } from "./icons/MoonIcon";
import { SunDimIcon } from "./icons/SunDimIcon";

export const ThemeButton = ({
  theme,
  handleChangeTheme,
}: {
  theme: string;
  handleChangeTheme: () => void;
}) => {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileTap={{
        scale: 0.95,
      }}
      onClick={() => void handleChangeTheme()}
      className="black:text-white rounded-full  p-2 text-black no-underline  hover:bg-black/20 dark:text-white dark:hover:bg-white/20"
    >
      {theme === "light" ? (
        <motion.div
          key="light"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <MoonIcon />
        </motion.div>
      ) : (
        <motion.div
          key="dark"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <SunDimIcon />
        </motion.div>
      )}
    </motion.button>
  );
};
