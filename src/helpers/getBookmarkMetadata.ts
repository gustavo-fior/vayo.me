/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fetch, { type RequestInit } from "node-fetch";
import { URL } from "url";
import { capitalizeFirstLetter } from "./capitalizeFirstLetter";
import { getCommonFavicons, getWebsiteName } from "./getCommonFavicons";
import { JSDOM } from "jsdom";

// Add a simple in-memory cache
const metadataCache: Record<string, BookmarkMetadata & { timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export const getBookmarkMetadata = async (
  url: string,
  options?: RequestInit
): Promise<BookmarkMetadata> => {
  try {
    // Check if we have a valid cached response
    const now = Date.now();
    if (metadataCache[url] && now - metadataCache[url].timestamp < CACHE_TTL) {
      const { timestamp, ...metadata } = metadataCache[url];
      return metadata;
    }

    const response = await fetch(
      url,
      options ?? {
        redirect: "manual",
        headers: {
          mode: "same-origin",
          Cookie:
            "guest_id=v1%3A169688089407904299; guest_id_ads=v1%3A169688089407904299; guest_id_marketing=v1%3A169688089407904299;",
        },
      }
    );

    // REDIRECT
    if (response.status >= 300 && response.status < 400) {
      console.log("redirecting to : " + response.headers.get("location"));

      const originalUrl = new URL(url);
      // get host and path
      const redirectUrl = new URL(
        response.headers.get("location") ?? "",
        originalUrl.origin
      ).href;

      if (!redirectUrl) {
        throw new Error("Redirect location header missing");
      }

      return getBookmarkMetadata(redirectUrl, requestOptions);
    }

    // ERROR
    if (response.status >= 400) {
      console.log("error: " + response.status);
      const { pageTitle, logo, image, description } = await getMetadataThroughMicrolinkAPI(
        url,
        null,
        null,
        null
      );

      let faviconUrl = logo ?? getCommonFavicons(url);
      const ogImageUrl = image;
      let title = pageTitle;

      if (!title) {
        title = getWebsiteName(url);
        title = capitalizeFirstLetter(title);
      }

      if (!faviconUrl) {
        faviconUrl = "/images/logo.png";
      }

      const result = {
        title,
        faviconUrl,
        ogImageUrl,
        description,
      };

      // Cache the result
      metadataCache[url] = { ...result, timestamp: Date.now() };
      return result;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document: Document = dom.window.document;

    let title = await getTitle(url, document);
    let ogImageUrl = await getOgImageUrl(url, document);
    let faviconUrl = null;

    faviconUrl = getCommonFavicons(url);

    if (!faviconUrl) {
      faviconUrl = await getFaviconUrl(url, document);
    }

    if (
      !faviconUrl ||
      !title ||
      !ogImageUrl ||
      getWebsiteName(url) === "x" ||
      getWebsiteName(url) === "X" ||
      getWebsiteName(url) === "twitter"
    ) {
      const { pageTitle, logo, image } = await getMetadataThroughMicrolinkAPI(
        url,
        faviconUrl,
        null,
        null
      );

      faviconUrl = logo;
      title = pageTitle ?? "";
      ogImageUrl = image;
    }

    if (!title) {
      title = getWebsiteName(url);
      title = capitalizeFirstLetter(title);
    }

    if (!faviconUrl) {
      faviconUrl = "/images/logo.png";
    }

    const description = getOgDescription(url, document);

    const result = {
      title,
      faviconUrl,
      ogImageUrl,
      description
    };

    // Cache the result
    metadataCache[url] = { ...result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error("Error fetching page metadata:", error);
    return {
      title: "",
      faviconUrl: null,
      ogImageUrl: null,
      description: null,
    };
  }
};

export type BookmarkMetadata = {
  title: string;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  description?: string | null;
};

// tries to get the favicon url from the given url, if it fails, it tries to get the favicon url from the root url
const getFaviconUrl = async (
  url: string,
  document: Document
): Promise<string | null> => {
  const faviconElement: HTMLElement | null =
    document.querySelector("link[rel='icon']");
  const appleTouchIconElement: HTMLElement | null = document.querySelector(
    "link[rel='apple-touch-icon']"
  );
  const shortcutIconElement: HTMLElement | null = document.querySelector(
    "link[rel='shortcut icon']"
  );

  let faviconUrl: string | null = null;

  // First try to get the apple touch icon
  if (appleTouchIconElement) {
    const appleTouchIconResponse = await fetch(
      new URL(appleTouchIconElement.getAttribute("href") ?? "", url).href
    );

    if (appleTouchIconResponse.ok)
      faviconUrl = appleTouchIconElement.getAttribute("href");
  }

  if (faviconElement && !faviconUrl) {
    const faviconResponse = await fetch(
      new URL(faviconElement.getAttribute("href") ?? "", url).href
    );

    if (faviconResponse.ok) faviconUrl = faviconElement.getAttribute("href");
  }

  if (shortcutIconElement && !faviconUrl) {
    const shortcutIcon = await fetch(
      new URL(shortcutIconElement.getAttribute("href") ?? "", url).href
    );

    if (shortcutIcon.ok) faviconUrl = shortcutIconElement.getAttribute("href");
  }

  if (!faviconUrl && new URL(url).pathname !== "/") {
    const response = await fetch(new URL("/", url).href, requestOptions);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document: Document = dom.window.document;

    faviconUrl = await getFaviconUrl(new URL("/", url).href, document);

    return faviconUrl ? new URL(faviconUrl, url).toString() : null;
  }

  if (!faviconUrl) {
    faviconUrl = new URL("favicon.ico", url).href;
  }

  return faviconUrl ? new URL(faviconUrl, url).toString() : null;
};

const getOgImageUrl = async (
  url: string,
  document: Document
): Promise<string | null> => {
  let ogImageUrl: string | null | undefined = null;

  let ogImageElement = document.querySelector("meta[property='og:image']");

  if (!ogImageElement) {
    ogImageElement = document.querySelector("meta[name='og:image']");
  }

  ogImageUrl = ogImageElement?.getAttribute("content");

  if (!ogImageUrl) {
    const twitterImageElement = document.querySelector(
      "meta[name='twitter:image']"
    );
    const twitterImageUrl: string | null | undefined =
      twitterImageElement?.getAttribute("content");

    if (twitterImageUrl) {
      const twitterImageResponse = await fetch(
        new URL(twitterImageUrl, url).href
      );

      if (twitterImageResponse.ok) ogImageUrl = twitterImageUrl;
    }
  }

  if (!ogImageUrl) {
    const imageElement = document.querySelector("img");

    if (imageElement) {
      const imageResponse = await fetch(
        new URL(imageElement.getAttribute("src") ?? "", url).href
      );

      if (imageResponse.ok) ogImageUrl = imageElement.getAttribute("src");
    }
  }

  if (!ogImageUrl && new URL(url).pathname !== "/") {
    const response = await fetch(new URL("/", url).href, requestOptions);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document: Document = dom.window.document;

    ogImageUrl = await getOgImageUrl(new URL("/", url).href, document);

    return ogImageUrl ? new URL(ogImageUrl, url).toString() : null;
  }

  return ogImageUrl ? new URL(ogImageUrl, url).toString() : null;
};

// tries to get the title from the given url, if it fails, it tries to get the title from the root url
const getTitle = async (url: string, document: Document): Promise<string> => {
  let title: string | null | undefined = null;

  title = document
    .querySelector("meta[property='og:title']")
    ?.getAttribute("content");

  if (!title) title = document.querySelector("title")?.textContent;

  const rootUrl = new URL("/", url).href;

  if (!title) {
    const response = await fetch(rootUrl, requestOptions);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    title = document
      .querySelector("meta[property='og:title']")
      ?.getAttribute("content");

    if (!title) title = document.querySelector("title")?.textContent;
  }

  if (!title) {
    title =
      rootUrl.split("/")[2]?.split(".")[0] === "www"
        ? capitalizeFirstLetter(rootUrl.split("/")[2]?.split(".")[1] ?? "")
        : capitalizeFirstLetter(rootUrl.split("/")[2]?.split(".")[0] ?? "");
  }

  return title;
};

export const requestOptions: RequestInit = {
  redirect: "follow",
  follow: 20,
  headers: {
    mode: "same-origin",
    Cookie:
      "guest_id=v1%3A169688089407904299; guest_id_ads=v1%3A169688089407904299; guest_id_marketing=v1%3A169688089407904299;",
  },
};

const getMetadataThroughMicrolinkAPI = async (
  url: string,
  faviconUrl?: string | null,
  title?: string | null,
  ogImageUrl?: string | null
): Promise<{
  logo: string | null;
  image: string | null;
  pageTitle: string | null;
  description: string | null;
}> => {
  const response1 = await fetch(`https://api.microlink.io/?url=${url}`);

  if (!response1.ok) {
    throw new Error("Microlink API error");
  }

  const jsonResponse = (await response1.json()) as ApiResponse;

  if (faviconUrl === null) {
    faviconUrl = jsonResponse.data?.logo?.url;
  }

  if (title === null) {
    title = jsonResponse.data?.title;
  }

  if (ogImageUrl === null) {
    ogImageUrl = jsonResponse.data?.image?.url;
  }

  return {
    logo: faviconUrl ?? null,
    image: ogImageUrl ?? null,
    pageTitle: title ?? null,
    description: jsonResponse.data?.description ?? null,
  };
};

type ApiResponse = {
  status: string;
  data: {
    title: string;
    description: string;
    lang: string;
    author: string | null;
    publisher: string;
    image: {
      url: string;
      type: string;
      size: number;
      height: number;
      width: number;
      size_pretty: string;
    };
    date: string;
    url: string;
    logo: {
      url: string;
      type: string;
      size: number;
      height: number;
      width: number;
      size_pretty: string;
    };
  };
  statusCode: number;
  headers: Record<string, string | number | null | string[] | undefined>;
};

const getOgDescription = (url: string, document: Document): string | null => {
  const ogDescriptionElement = document.querySelector(
    "meta[property='og:description']"
  );

  if (ogDescriptionElement) {
    return ogDescriptionElement.getAttribute("content") ?? null;
  }

  const descriptionElement = document.querySelector(
    "meta[name='description']"
  );

  if (descriptionElement) {
    return descriptionElement.getAttribute("content") ?? null;
  }

  return null;
}
