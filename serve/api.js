import { exec } from "child_process";
import { readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, extname } from "path";
import { promisify } from "util";
import { ROOT, SEARCH_DIRS } from "./config.js";

const MIME = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
  ico: "image/x-icon", mp4: "video/mp4",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
};

const ASSET_ROOTS = [
  join(ROOT, "docs/tailwindcss/public"),
  join(ROOT, "docs/tailwindcss/src/docs"),
  join(ROOT, "docs/filament/docs-assets"),
];

export async function serveAsset(urlPath) {
  for (const root of ASSET_ROOTS) {
    const candidate = join(root, urlPath);
    if (!candidate.startsWith(root)) continue;
    if (!existsSync(candidate)) continue;
    try {
      const s = await stat(candidate);
      if (!s.isFile()) continue;
      const ext = extname(candidate).slice(1).toLowerCase();
      const body = await readFile(candidate);
      return { status: 200, body, type: MIME[ext] ?? "application/octet-stream" };
    } catch { continue; }
  }
  return null;
}

const execAsync = promisify(exec);

export const SOURCES = [
  ...new Set(SEARCH_DIRS.filter((d) => existsSync(join(ROOT, d.path))).map((d) => d.label)),
];

function escERE(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function shellQuote(s) {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export async function search(query, selectedSources, titlesOnly) {
  const dirs = selectedSources.length
    ? SEARCH_DIRS.filter((d) => selectedSources.includes(d.label))
    : SEARCH_DIRS;

  const results = [];

  for (const dir of dirs) {
    const absPath = join(ROOT, dir.path);
    if (!existsSync(absPath)) continue;

    const includes = dir.exts.map((e) => `--include='*${e}'`).join(" ");
    let flag, pattern;

    if (titlesOnly) {
      const q = escERE(query);
      const isMd = dir.exts.some((e) => e === ".md" || e === ".mdx");
      const isHtml = dir.exts.includes(".html");
      if (isMd) {
        flag = "-E";
        pattern = shellQuote(`^(#{1,6} |title: ).*${q}`);
      } else if (isHtml) {
        flag = "-E";
        pattern = shellQuote(`<h[1-6][^>]*>.*${q}|<title>.*${q}`);
      } else {
        continue;
      }
    } else {
      flag = "-F";
      pattern = shellQuote(query);
    }

    const cmd = `grep -rn -i ${flag} -m 3 ${includes} ${pattern} '${absPath}' 2>/dev/null`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 5 * 1024 * 1024 }).catch(() => ({ stdout: "" }));

    const byFile = {};
    for (const line of stdout.split("\n").filter(Boolean)) {
      const c1 = line.indexOf(":");
      const c2 = line.indexOf(":", c1 + 1);
      if (c1 < 0 || c2 < 0) continue;
      const file = line.slice(0, c1);
      const text = line.slice(c2 + 1).trim();
      if (!byFile[file]) byFile[file] = { path: file, rel: relative(ROOT, file), label: dir.label, snippets: [] };
      byFile[file].snippets.push(text);
    }

    results.push(...Object.values(byFile));
    if (results.length >= 50) break;
  }

  return results.slice(0, 50);
}

async function dirHasContent(absDir, exts) {
  try {
    const items = await readdir(absDir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        if (await dirHasContent(join(absDir, item.name), exts)) return true;
      } else if (exts.includes(extname(item.name))) {
        return true;
      }
    }
  } catch { }
  return false;
}

async function dirSingleIndex(absDir, exts) {
  try {
    const items = await readdir(absDir, { withFileTypes: true });
    if (items.some((i) => i.isDirectory())) return null;
    const matching = items.filter((i) => exts.includes(extname(i.name)));
    if (matching.length === 1 && matching[0].name.startsWith("index.")) {
      return join(absDir, matching[0].name);
    }
  } catch { }
  return null;
}

export async function listTree(source, subpath) {
  const dirs = SEARCH_DIRS.filter((d) => d.label === source);
  if (!dirs.length) return [];

  const entries = [];

  for (const dir of dirs) {
    const base = join(ROOT, dir.path);
    const target = subpath ? join(base, subpath) : base;
    if (!existsSync(target)) continue;

    const items = await readdir(target, { withFileTypes: true });
    for (const item of items) {
      const abs = join(target, item.name);
      const rel = relative(ROOT, abs);
      const itemSubpath = subpath ? join(subpath, item.name) : item.name;

      if (item.isDirectory()) {
        const indexPath = await dirSingleIndex(abs, dir.exts);
        if (indexPath) {
          entries.push({ name: item.name, path: indexPath, rel: relative(ROOT, indexPath), subpath: itemSubpath, isDir: false });
        } else if (await dirHasContent(abs, dir.exts)) {
          entries.push({ name: item.name, path: abs, rel, subpath: itemSubpath, isDir: true });
        }
      } else if (dir.exts.includes(extname(item.name))) {
        entries.push({ name: item.name, path: abs, rel, subpath: itemSubpath, isDir: false });
      }
    }
  }

  return entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function serveFile(filePath) {
  if (!filePath.startsWith(ROOT)) return { status: 403, body: "Forbidden" };
  try {
    const body = await readFile(filePath, "utf-8");
    const ext = filePath.split(".").pop().toLowerCase();
    const type = ext === "html" ? "text/html" : "text/plain";
    return { status: 200, body, type };
  } catch {
    return { status: 404, body: "Not found" };
  }
}
