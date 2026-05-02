const PLACEHOLDER_COLORS = [
  "#fca5a5",
  "#fdba74",
  "#fcd34d",
  "#bef264",
  "#86efac",
  "#5eead4",
  "#7dd3fc",
  "#a5b4fc",
  "#c4b5fd",
  "#f0abfc",
  "#f9a8d4",
];

export function getPlaceholderColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}
