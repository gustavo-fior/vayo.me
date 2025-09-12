// Helper function to group bookmarks by month
export function groupBookmarksByMonth(bookmarks: any[]) {
  const groups: { [key: string]: any[] } = {};

  bookmarks.forEach((bookmark) => {
    const date = new Date(bookmark.createdAt);
    const monthKey = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(bookmark);
  });

  // Sort months in descending order (newest first)
  const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
    const dateA = new Date(a + " 1"); // Add day to make it a valid date
    const dateB = new Date(b + " 1");
    return dateB.getTime() - dateA.getTime();
  });

  return sortedEntries;
}
