import urlMetadata from "url-metadata";

export type BookmarkMetadata = {
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
};

const options = {
  // (Node.js v18+ only)
  // To prevent SSRF attacks, the default option below blocks
  // requests to private network & reserved IP addresses via:
  // https://www.npmjs.com/package/request-filtering-agent
  // Browser security policies prevent SSRF automatically.
  requestFilteringAgentOptions: undefined,

  // (Browser only) `fetch` API cache setting
  cache: "no-cache",

  // (Browser only) `fetch` API mode (ex: 'cors', 'same-origin', etc)
  mode: "cors",

  // Maximum redirects in request chain, defaults to 10
  maxRedirects: 10,

  // `fetch` timeout in milliseconds, default is 10 seconds
  timeout: 10000,

  // Include raw response body as string
  includeResponseBody: false,

  // Alternate use-case: pass in `Response` object here to be parsed
  // see example below
  parseResponseObject: undefined,
};

const YOUTUBE_SUFFIX = " - YouTube";
const YOUTUBE_GENERIC_TITLES = new Set([
  "YouTube",
  "- YouTube",
  "Home - YouTube",
  "YouTube - Broadcast Yourself",
  "Untitled",
]);
const YOUTUBE_GENERIC_DESCRIPTION_PREFIX =
  "Enjoy the videos and music you love";

function normalizeStringValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeUrlValue(value: string | null | undefined) {
  const normalized = normalizeStringValue(value);

  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

function getYouTubeVideoId(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (
      hostname.endsWith("youtube.com") ||
      hostname.endsWith("youtube-nocookie.com")
    ) {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v");
      }

      const [, collection, id] = parsedUrl.pathname.split("/");
      if (["embed", "live", "shorts"].includes(collection)) {
        return id ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getCanonicalYouTubeUrl(url: string) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

function normalizeTitle(value: string | null | undefined, url: string) {
  const normalized = normalizeStringValue(value);

  if (!normalized) {
    return null;
  }

  const canonicalYouTubeUrl = getCanonicalYouTubeUrl(url);
  if (!canonicalYouTubeUrl) {
    return normalized === "Untitled" ? null : normalized;
  }

  if (YOUTUBE_GENERIC_TITLES.has(normalized)) {
    return null;
  }

  if (normalized.endsWith(YOUTUBE_SUFFIX)) {
    return normalizeStringValue(
      normalized.slice(0, normalized.length - YOUTUBE_SUFFIX.length)
    );
  }

  return normalized;
}

function normalizeDescription(value: string | null | undefined, url: string) {
  const normalized = normalizeStringValue(value);

  if (!normalized) {
    return null;
  }

  if (
    getCanonicalYouTubeUrl(url) &&
    normalized.startsWith(YOUTUBE_GENERIC_DESCRIPTION_PREFIX)
  ) {
    return null;
  }

  return normalized;
}

async function getYouTubeOEmbed(url: string) {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        url
      )}&format=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      title?: string;
      thumbnail_url?: string;
    };

    return {
      title: normalizeTitle(data.title, url),
      thumbnailUrl: normalizeUrlValue(data.thumbnail_url),
    };
  } catch {
    return null;
  }
}

export function mergeBookmarkMetadata(
  url: string,
  current: Partial<BookmarkMetadata>,
  incoming: Partial<BookmarkMetadata>
): BookmarkMetadata {
  return {
    title:
      normalizeTitle(current.title, url) ?? normalizeTitle(incoming.title, url),
    description:
      normalizeDescription(current.description, url) ??
      normalizeDescription(incoming.description, url),
    faviconUrl:
      normalizeUrlValue(current.faviconUrl) ??
      normalizeUrlValue(incoming.faviconUrl),
    ogImageUrl:
      normalizeUrlValue(current.ogImageUrl) ??
      normalizeUrlValue(incoming.ogImageUrl),
  };
}

export const getUrlMetadata = async (url: string) => {
  const metadataUrl = getCanonicalYouTubeUrl(url) ?? url;

  try {
    const [metadata, youtubeOEmbed] = await Promise.all([
      urlMetadata(metadataUrl, options),
      getCanonicalYouTubeUrl(url) ? getYouTubeOEmbed(metadataUrl) : null,
    ]);

    return mergeBookmarkMetadata(
      url,
      {},
      {
        title: youtubeOEmbed?.title ?? metadata?.title ?? null,
        description: metadata?.description ?? null,
        faviconUrl: metadata?.favicons?.[0]?.href
          ? new URL(metadata.favicons[0].href, metadataUrl).toString()
          : null,
        ogImageUrl:
          youtubeOEmbed?.thumbnailUrl ??
          (typeof metadata?.["og:image"] === "string"
            ? metadata["og:image"]
            : null),
      }
    );
  } catch (err) {
    console.log(err);
    return {
      title: null,
      description: null,
      faviconUrl: null,
      ogImageUrl: null,
    };
  }
};
