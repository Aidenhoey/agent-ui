import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(packageRoot, "src");
const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [target];
  }));
  return nested.flat();
}

function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

const imported = new Set();
const importPattern = /(?:from\s*|import\s*\()\s*["']([^"']+)["']/g;
for (const file of await sourceFiles(sourceRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier || specifier.startsWith(".") || specifier.startsWith("node:")) continue;
    imported.add(packageName(specifier));
  }
}

const declared = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
]);
const missing = [...imported].filter((dependency) => !declared.has(dependency)).sort();
const unused = [...declared].filter((dependency) => !imported.has(dependency)).sort();

if (missing.length || unused.length) {
  throw new Error([
    missing.length ? `missing runtime declarations: ${missing.join(", ")}` : "",
    unused.length ? `unused runtime declarations: ${unused.join(", ")}` : "",
  ].filter(Boolean).join("; "));
}

process.stdout.write(`dependency declarations passed (${[...imported].sort().join(", ")})\n`);
