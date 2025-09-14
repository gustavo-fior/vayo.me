export const getCommonFavicons = (url: string): string | null => {
  const host = getWebsiteName(url);

  switch (host) {
    case "youtube":
    case "youtu.be":
      return "/favicons/youtube.png";
    case "reddit":
      return "/favicons/reddit.png";
    case "twitter":
      return "/favicons/x.png";
    case "x":
      return "/favicons/x.png";
    case "facebook":
      return "/favicons/facebook.ico";
    case "instagram":
      return "/favicons/instagram.png";
    case "amazon":
      return "/favicons/amazon.ico";
    case "netflix":
      return "/favicons/netflix.ico";
    case "wikipedia":
      return "/favicons/wikipedia.png";
    case "substack":
      return "/favicons/substack.png";
    case "medium":
      return "/favicons/medium.png";
    case "nytimes":
      return "/favicons/nytimes.ico";
    case "wsj":
      return "/favicons/wsj.png";
    case "apple":
      return "/favicons/apple.ico";
    case "microsoft":
      return "/favicons/microsoft.ico";
    case "google":
      return "/favicons/google.ico";
    case "yahoo":
      return "/favicons/yahoo.ico";
    case "bing":
      return "/favicons/bing.ico";
    case "openai":
      return "/favicons/openai.png";
    case "spotify":
      return "/favicons/spotify.png";
    case "github":
      return "/favicons/github.svg";
    case "airbnb":
      return "/favicons/airbnb.png";
    default:
      return null;
  }
};

export const getWebsiteName = (url: string) => {
  let websiteName = "";
  try {
    const parsedURL = new URL(url);
    const hostnameParts = parsedURL.hostname.split(".");
    let domainName = "";
    if (hostnameParts.length >= 2) {
      if (
        hostnameParts[0]?.toLowerCase() === "www" ||
        hostnameParts[0]?.toLowerCase() === "m" ||
        hostnameParts[0]?.toLowerCase() === "mobile" ||
        hostnameParts[0]?.toLowerCase() === "en" ||
        hostnameParts[0]?.toLowerCase() === "br" ||
        hostnameParts[0]?.toLowerCase() === "es" ||
        hostnameParts[0]?.toLowerCase() === "fr" ||
        hostnameParts[0]?.toLowerCase() === "de" ||
        hostnameParts[0]?.toLowerCase() === "it" ||
        hostnameParts[0]?.toLowerCase() === "ja" ||
        hostnameParts[0]?.toLowerCase() === "ru" ||
        hostnameParts[0]?.toLowerCase() === "zh" ||
        hostnameParts[0]?.toLowerCase() === "ar" ||
        hostnameParts[0]?.toLowerCase() === "hi" ||
        hostnameParts[0]?.toLowerCase() === "pt" ||
        hostnameParts[0]?.toLowerCase() === "ko" ||
        hostnameParts[0]?.toLowerCase() === "id" ||
        hostnameParts[0]?.toLowerCase() === "tr" ||
        hostnameParts[0]?.toLowerCase() === "pl"
      ) {
        domainName = hostnameParts[1] ?? "";
      } else {
        if (
          hostnameParts[1]?.toLowerCase() !== "com" &&
          hostnameParts[1]?.toLowerCase() !== "co" &&
          hostnameParts[1]?.toLowerCase() !== "org" &&
          hostnameParts[1]?.toLowerCase() !== "net" &&
          hostnameParts[1]?.toLowerCase() !== "gov" &&
          hostnameParts[1]?.toLowerCase() !== "edu" &&
          hostnameParts[1]?.toLowerCase() !== "io" &&
          hostnameParts[1]?.toLowerCase() !== "dev" &&
          hostnameParts[1]?.toLowerCase() !== "ai" &&
          hostnameParts[1]?.toLowerCase() !== "tv" &&
          hostnameParts[1]?.toLowerCase() !== "me" &&
          hostnameParts[1]?.toLowerCase() !== "us" &&
          hostnameParts[1]?.toLowerCase() !== "uk" &&
          hostnameParts[1]?.toLowerCase() !== "app" &&
          hostnameParts[1]?.toLowerCase() !== "so"
        ) {
          domainName = hostnameParts[1] ?? "";
        } else {
          domainName = hostnameParts[0] ?? "";
        }
      }
      if (domainName.includes("com")) {
        const index = domainName.indexOf("com");
        websiteName = domainName.slice(0, index + 3);
      } else {
        websiteName = domainName;
      }
    } else {
      websiteName = parsedURL.hostname;
    }
  } catch (error) {
    console.error("Error parsing URL:", error);
  }
  return websiteName;
};
