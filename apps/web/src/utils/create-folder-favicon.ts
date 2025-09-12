export const getFaviconForFolder = (icon: string | null | undefined) => {
  return icon
    ? `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%22-4 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${icon}</text></svg>`
    : "/favicon.ico";
};
