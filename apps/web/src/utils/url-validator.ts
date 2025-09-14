export function isValidURL(input: string): boolean {
  // Check if it's a valid URL with or without protocol, or a local path
  const urlWithProtocolPattern =
    /^(ftp|http|https):\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/i;
  const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/;
  const localPathPattern = /^\/[a-zA-Z0-9._/-]+$/;

  return (
    urlWithProtocolPattern.test(input) ||
    domainPattern.test(input) ||
    localPathPattern.test(input)
  );
}

export function addHttpIfMissing(input: string): string {
  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    return `https://${input}`;
  }
  return input;
}
