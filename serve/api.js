import { exec } from "child_process";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, relative } from "path";
import { promisify } from "util";
import { ROOT, SEARCH_DIRS } from "./config.js";

const execAsync = promisify(exec);

export const SOURCES = [...new Set(SEARCH_DIRS.map((d) => d.label))];

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
