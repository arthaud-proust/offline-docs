#!/usr/bin/env node

// @mise description="Download PHP manual and extract into docs/php/"

import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

console.log("Done.");
