const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_PATTERN = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;
const OKLCH_PATTERN = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*(\/.+)?\s*\)$/;

export function isValidColor(input: string): boolean {
  const trimmed = input.trim();
  return (
    HEX_PATTERN.test(trimmed) ||
    RGB_PATTERN.test(trimmed) ||
    OKLCH_PATTERN.test(trimmed)
  );
}
