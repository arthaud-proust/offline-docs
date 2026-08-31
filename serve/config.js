import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SEARCH_DIRS = [
    { label: "Laravel", path: "docs/laravel", exts: [".md"] },
    { label: "Filament", path: "docs/filament/docs", exts: [".md"] },
    { label: "Filament", path: "docs/filament/packages", exts: [".md"] },
    { label: "Tailwind", path: "docs/tailwindcss/src/docs", exts: [".mdx"] },
    { label: "PHP", path: "docs/php", exts: [".md"] },
    { label: "JS", path: "docs/mdn/files/en-us/web/javascript", exts: [".md"] },
    { label: "CSS", path: "docs/mdn/files/en-us/web/css", exts: [".md"] },
    { label: "HTML", path: "docs/mdn/files/en-us/web/html", exts: [".md"] },
    { label: "Web", path: "docs/mdn/files/en-us/web/", exts: [".md"] },
];
