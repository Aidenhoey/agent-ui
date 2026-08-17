import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "agent-ui-tree-shaking-"));

try {
  const entry = path.join(fixtureRoot, "entry.js");
  const outDir = path.join(fixtureRoot, "dist");
  await writeFile(
    entry,
    `import { classifyToolKind } from "@aidenhoey/agent-ui";\nconsole.log(classifyToolKind("browser.search"));\n`,
  );

  await build({
    configFile: false,
    logLevel: "silent",
    resolve: {
      alias: {
        "@aidenhoey/agent-ui": path.join(packageRoot, "dist", "index.js"),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      minify: true,
      rollupOptions: { input: entry },
    },
  });

  const assetDir = path.join(outDir, "assets");
  const javaScriptFiles = (await readdir(assetDir)).filter((name) => name.endsWith(".js"));
  const output = (await Promise.all(javaScriptFiles.map((name) => readFile(path.join(assetDir, name), "utf8")))).join("\n");
  if (output.includes("Generate the comparison analysis document") || output.includes("buildScenarios")) {
    throw new Error("demo code leaked into a root-entry tree-shaken bundle");
  }
  if (Buffer.byteLength(output) > 5_000) {
    throw new Error(`tree-shaken bundle is unexpectedly large: ${Buffer.byteLength(output)} bytes`);
  }
  process.stdout.write(`tree-shaken root import passed (${Buffer.byteLength(output)} bytes)\n`);
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
