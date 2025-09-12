import { format, isThisYear } from "date-fns";

export function formatDate(date: Date) {
  if (isThisYear(date)) {
    return format(date, "MMM d"); // e.g., "Mar 6"
  } else {
    return format(date, "MMM d, yyyy"); // e.g., "Mar 6, 2024"
  }
}
