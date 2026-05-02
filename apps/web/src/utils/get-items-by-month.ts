import type { ItemRecord } from "@/types/items";

export function groupItemsByMonth(items: ItemRecord[]) {
  const groups: Record<string, ItemRecord[]> = {};

  items.forEach((item) => {
    const date = new Date(item.createdAt);
    const monthKey = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(item);
  });

  const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
    const dateA = new Date(a + " 1");
    const dateB = new Date(b + " 1");
    return dateB.getTime() - dateA.getTime();
  });

  return sortedEntries;
}
