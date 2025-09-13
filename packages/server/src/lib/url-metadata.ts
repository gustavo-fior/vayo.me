import urlMetadata from "url-metadata";

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

export const getUrlMetadata = async (url: string) => {
  // Basic options usage
  try {
    const metadata = await urlMetadata(url, options);

    console.log(metadata);

    return metadata;
  } catch (err) {
    console.log(err);
    return null;
  }
};
