import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SEARCH_DIRS = [
  { label: "Laravel",  path: "laravel",              exts: [".md"] },
  { label: "Filament", path: "filament/docs",        exts: [".md"] },
  { label: "Filament", path: "filament/packages",    exts: [".md"] },
  { label: "Tailwind", path: "tailwindcss/src/docs", exts: [".mdx"] },
  { label: "MDN",      path: "mdn/files/en-us",      exts: [".md"] },
  { label: "PHP",      path: "php",                  exts: [".html"] },
];
