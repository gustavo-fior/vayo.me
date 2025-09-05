import { motion } from "framer-motion";
import { AlignCenterIcon } from "./icons/AlignCenterIcon";
import { AlignVerticalIcon } from "./icons/AlignVerticalIcon";

export const ViewButton = ({
  viewStyle,
  handleChangeViewStyle,
}: {
  viewStyle: string;
  handleChangeViewStyle: () => void;
}) => {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileTap={{
        scale: 0.95,
      }}
      onClick={() => handleChangeViewStyle()}
      className="black:text-white rounded-full  p-2 text-black no-underline  hover:bg-black/20 dark:text-white dark:hover:bg-white/20"
    >
      {viewStyle === "compact" ? (
        <motion.div
          key="compact"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <AlignVerticalIcon />
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <AlignCenterIcon />
        </motion.div>
      )}
    </motion.button>
  );
};
