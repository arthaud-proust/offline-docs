#!/usr/bin/env node

// @mise description="Download PHP manual and extract into docs/php/"

import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readdir, readFile, writeFile, unlink } from "fs/promises";
import { parse as parseHtml } from "node-html-parser";
import { NodeHtmlMarkdown } from "node-html-markdown";

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../..");
const url = "https://www.php.net/distributions/manual/php_manual_en.tar.gz";
const dest = join(projectRoot, "docs/php");
const tarball = join(projectRoot, "php_manual_en.tar.gz");

console.log("Downloading PHP manual...");
const response = await fetch(url);
if (!response.ok) throw new Error(`HTTP ${response.status}`);

mkdirSync(dest, { recursive: true });
await pipeline(response.body, createWriteStream(tarball));

console.log("Extracting...");
await execAsync(`tar -xzf "${tarball}" -C "${dest}" --strip-components=1`);
await execAsync(`rm "${tarball}"`);

console.log("Converting HTML to Markdown...");

const files = await readdir(dest);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
let converted = 0;

for (const file of htmlFiles) {
    const filePath = join(dest, file);
    const html = await readFile(filePath, "utf-8");
    const root = parseHtml(html);

    const content = root.querySelector("#layout-content");
    if (!content) {
        await unlink(filePath);
        continue;
    }

    // Strip syntax-highlight spans from phpcode blocks, leaving clean PHP text
    for (const el of content.querySelectorAll(".phpcode")) {
        const pre = el.querySelector("pre");
        if (!pre) continue;
        const cleaned = pre.innerHTML
            .replace(/<code[^>]*>/g, "")
            .replace(/<\/code>/g, "")
            .replace(/<span[^>]*>/g, "")
            .replace(/<\/span>/g, "");
        pre.innerHTML = `<code class="language-php">${cleaned}</code>`;
    }

    // Strip wrapper from output example blocks
    for (const el of content.querySelectorAll(".examplescode")) {
        const pre = el.querySelector("pre");
        if (!pre) continue;
        pre.innerHTML = `<code>${pre.innerHTML}</code>`;
    }

    // Rewrite internal .html links to .md
    for (const a of content.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href");
        if (
            href &&
            !href.startsWith("http") &&
            !href.startsWith("#") &&
            href.endsWith(".html")
        ) {
            a.setAttribute("href", href.replace(/\.html$/, ".md"));
        }
    }

    const markdown = NodeHtmlMarkdown.translate(content.innerHTML);
    const mdPath = join(dest, file.replace(/\.html$/, ".md"));
    await writeFile(mdPath, markdown, "utf-8");
    await unlink(filePath);
    converted++;
}

console.log(`Converted ${converted} files. Done.`);
