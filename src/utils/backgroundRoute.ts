export const BACKGROUND_PATHS = [
  "/background-remover",
  "/remove-bg-alternative",
  "/remove-bg-alternative-free-india",
  "/white-background-for-meesho-amazon"
] as const;

export type BackgroundPath = (typeof BACKGROUND_PATHS)[number];

export function backgroundPath(pathname = window.location.pathname): BackgroundPath | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  return BACKGROUND_PATHS.find(item => item === path);
}
