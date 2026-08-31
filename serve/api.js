import { exec } from "child_process";
import { readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, extname } from "path";
import { promisify } from "util";
import { ROOT, SEARCH_DIRS } from "./config.js";

const MIME = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    mp4: "video/mp4",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
};

const toRootPath = (relPath) => join(ROOT, relPath);
const fromRootPath = (rootPath) => relative(ROOT, rootPath);

const ASSET_ROOTS = [
    toRootPath("docs/tailwindcss/public"),
    toRootPath("docs/tailwindcss/src/docs"),
    toRootPath("docs/filament/docs-assets"),
];

const MAX_BUFFER = 5 * 1024 * 1024;

export async function serveAsset(urlPath) {
    for (const assetRoot of ASSET_ROOTS) {
        const candidate = join(assetRoot, urlPath);
        if (!candidate.startsWith(assetRoot)) continue;
        if (!existsSync(candidate)) continue;
        try {
            const s = await stat(candidate);
            if (!s.isFile()) continue;
            const ext = extname(candidate).slice(1).toLowerCase();
            const body = await readFile(candidate);
            return {
                status: 200,
                body,
                type: MIME[ext] ?? "application/octet-stream",
            };
        } catch {
            continue;
        }
    }
    return null;
}

const execAsync = promisify(exec);

export const SOURCES = [
    ...new Set(
        SEARCH_DIRS.filter((d) => existsSync(toRootPath(d.path))).map(
            (d) => d.label,
        ),
    ),
];

function escERE(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function shellQuote(s) {
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

export async function search(query, selectedSources) {
    const dirs = selectedSources.length
        ? SEARCH_DIRS.filter((d) => selectedSources.includes(d.label))
        : SEARCH_DIRS;

    const seen = new Set();
    const results = [];

    function addResult(filePath, label, snippet, matchType) {
        if (seen.has(filePath)) return;
        seen.add(filePath);
        results.push({
            path: fromRootPath(filePath),
            label,
            snippets: snippet ? [snippet] : [],
            matchType,
        });
    }

    function grepByFile(stdout) {
        const byFile = {};
        for (const line of stdout.split("\n").filter(Boolean)) {
            const c1 = line.indexOf(":");
            const c2 = line.indexOf(":", c1 + 1);
            if (c1 < 0 || c2 < 0) continue;
            const file = line.slice(0, c1);
            if (!byFile[file]) byFile[file] = line.slice(c2 + 1).trim();
        }
        return byFile;
    }

    // Pass 1: filename match
    for (const dir of dirs) {
        const absPath = toRootPath(dir.path);
        if (!existsSync(absPath)) continue;
        const extFilter = dir.exts
            .map((e) => `-name ${shellQuote("*" + e)}`)
            .join(" -o ");
        const cmd = `find ${shellQuote(absPath)} -type f -iname ${shellQuote("*" + query + "*")} \\( ${extFilter} \\) 2>/dev/null`;
        const { stdout } = await execAsync(cmd, {
            maxBuffer: 2 * 1024 * 1024,
        }).catch(() => ({ stdout: "" }));
        for (const filePath of stdout.split("\n").filter(Boolean)) {
            addResult(filePath, dir.label, "", "filename");
        }
    }

    // Pass 2: title match
    for (const dir of dirs) {
        const absPath = toRootPath(dir.path);
        if (!existsSync(absPath)) continue;
        const includes = dir.exts.map((e) => `--include='*${e}'`).join(" ");
        const q = escERE(query);
        const pattern = shellQuote(`^(#{1,6} |title: ).*${q}`);
        const isMd = dir.exts.some((e) => e === ".md" || e === ".mdx");

        if (!isMd) continue;

        const cmd = `grep -rn -i -E -m 1 ${includes} ${pattern} ${shellQuote(absPath)} 2>/dev/null`;
        const { stdout } = await execAsync(cmd, {
            maxBuffer: MAX_BUFFER,
        }).catch(() => ({ stdout: "" }));
        for (const [filePath, snippet] of Object.entries(grepByFile(stdout))) {
            addResult(filePath, dir.label, snippet, "title");
        }
    }

    // Pass 3: content match
    for (const dir of dirs) {
        if (results.length >= 50) break;
        const absPath = toRootPath(dir.path);
        if (!existsSync(absPath)) continue;
        const includes = dir.exts.map((e) => `--include='*${e}'`).join(" ");
        const cmd = `grep -rn -i -F -m 1 ${includes} ${shellQuote(query)} ${shellQuote(absPath)} 2>/dev/null`;
        const { stdout } = await execAsync(cmd, {
            maxBuffer: MAX_BUFFER,
        }).catch(() => ({ stdout: "" }));
        for (const [filePath, snippet] of Object.entries(grepByFile(stdout))) {
            addResult(filePath, dir.label, snippet, "content");
            if (results.length >= 50) break;
        }
    }

    return results.slice(0, 50);
}

async function dirHasContent(absDir, exts) {
    try {
        const items = await readdir(absDir, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                if (await dirHasContent(join(absDir, item.name), exts))
                    return true;
            } else if (exts.includes(extname(item.name))) {
                return true;
            }
        }
    } catch {}
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
    } catch {}
    return null;
}

export async function listTree(source, subpath) {
    const dirs = SEARCH_DIRS.filter((d) => d.label === source);
    if (!dirs.length) return [];

    const entries = [];

    for (const dir of dirs) {
        const base = toRootPath(dir.path);
        const target = subpath ? join(base, subpath) : base;
        if (!existsSync(target)) continue;

        const items = await readdir(target, { withFileTypes: true });
        for (const item of items) {
            const abs = join(target, item.name);
            const rel = fromRootPath(abs);
            const itemSubpath = subpath ? join(subpath, item.name) : item.name;

            if (item.isDirectory()) {
                const indexPath = await dirSingleIndex(abs, dir.exts);
                if (indexPath) {
                    entries.push({
                        name: item.name,
                        path: fromRootPath(indexPath),
                        subpath: itemSubpath,
                        isDir: false,
                    });
                } else if (await dirHasContent(abs, dir.exts)) {
                    entries.push({
                        name: item.name,
                        path: rel,
                        subpath: itemSubpath,
                        isDir: true,
                    });
                }
            } else if (dir.exts.includes(extname(item.name))) {
                entries.push({
                    name: item.name,
                    path: rel,
                    subpath: itemSubpath,
                    isDir: false,
                });
            }
        }
    }

    return entries.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}

export async function serveFile(path) {
    const absPath = toRootPath(path);
    if (!absPath.startsWith(ROOT)) return { status: 403, body: "Forbidden" };
    try {
        const body = await readFile(absPath, "utf-8");
        return { status: 200, body, type: "text/plain" };
    } catch {
        return { status: 404, body: "Not found" };
    }
}
