#!/usr/bin/env node
// @mise description="Pull selected docs"

import { checkbox } from "@inquirer/prompts";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const DOCS = [
  { name: "Laravel",  type: "submodule", path: "docs/laravel" },
  { name: "Filament", type: "submodule", path: "docs/filament" },
  { name: "Tailwind", type: "submodule", path: "docs/tailwindcss" },
  { name: "MDN",      type: "submodule", path: "docs/mdn" },
  { name: "PHP",      type: "download",  path: "docs/php" },
];

const selected = await checkbox({
  message: "Which docs to pull?",
  choices: DOCS.map((d) => ({
    name: `${d.name} (${d.type})`,
    value: d.name,
    checked: true,
  })),
});

if (!selected.length) {
  console.log("Nothing selected.");
  process.exit(0);
}

const submodules = DOCS.filter((d) => selected.includes(d.name) && d.type === "submodule");
const pullPhp    = selected.includes("PHP");

if (submodules.length) {
  const paths = submodules.map((d) => d.path).join(" ");
  console.log(`\nUpdating: ${submodules.map((d) => d.name).join(", ")}…`);
  execSync(`git submodule update --init --remote --merge ${paths}`, { cwd: ROOT, stdio: "inherit" });
}

if (pullPhp) {
  execSync(`node ${join(ROOT, ".mise/tasks/pull/php.js")}`, { cwd: ROOT, stdio: "inherit" });
}
