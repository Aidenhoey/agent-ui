import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(workspaceRoot, "packages", "agent-ui");
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "agent-ui-consumer-"));

async function run(command, args, cwd = fixtureRoot, echo = true) {
  const { stdout, stderr } = await exec(command, args, {
    cwd,
    env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" },
    maxBuffer: 20 * 1024 * 1024,
  });
  if (echo && stdout.trim()) process.stdout.write(stdout);
  if (echo && stderr.trim()) process.stderr.write(stderr);
  return stdout;
}

try {
  await readFile(path.join(packageRoot, "dist", "index.js"));
  const packOutput = await run(
    "npm",
    ["pack", packageRoot, "--json", "--pack-destination", fixtureRoot],
    fixtureRoot,
    false,
  );
  const [{ filename }] = JSON.parse(packOutput);
  const tarball = path.join(fixtureRoot, filename);

  await mkdir(path.join(fixtureRoot, "src"));
  await writeFile(
    path.join(fixtureRoot, "package.json"),
    `${JSON.stringify({
      name: "agent-ui-consumer-fixture",
      private: true,
      type: "module",
      dependencies: {
        "@aidenhoey/agent-ui": `file:${tarball}`,
        react: "18.2.0",
        "react-dom": "18.2.0",
      },
      devDependencies: {
        "@types/react": "^18.2.79",
        "@types/react-dom": "^18.2.25",
        typescript: "^5.9.2",
      },
    }, null, 2)}\n`,
  );
  await writeFile(
    path.join(fixtureRoot, "tsconfig.json"),
    `${JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      include: ["src"],
    }, null, 2)}\n`,
  );
  await writeFile(
    path.join(fixtureRoot, "src", "consumer.tsx"),
    `import { Button, LocaleProvider, createRunStore, type PublicRunEvent } from "@aidenhoey/agent-ui";\nimport { buildScenarios } from "@aidenhoey/agent-ui/mock";\nimport "@aidenhoey/agent-ui/styles.css";\n\nconst event: PublicRunEvent | undefined = buildScenarios("en-US")[0]?.steps[0]?.event;\nconst store = createRunStore();\nexport const view = <LocaleProvider locale="en-US"><Button data-run={store.getState().runId}>{event?.event_type ?? "Start"}</Button></LocaleProvider>;\n`,
  );
  await writeFile(
    path.join(fixtureRoot, "render.mjs"),
    `import { stat } from "node:fs/promises";\nimport React from "react";\nimport { renderToString } from "react-dom/server";\nimport { Button, LocaleProvider } from "@aidenhoey/agent-ui";\nimport { buildScenarios } from "@aidenhoey/agent-ui/mock";\n\nconst html = renderToString(React.createElement(LocaleProvider, { locale: "en-US" }, React.createElement(Button, null, "Rendered")));\nif (!html.includes("Rendered")) throw new Error("SSR render did not contain component content");\nif (buildScenarios("en-US").length === 0) throw new Error("mock subpath did not load");\nconst cssPath = new URL(import.meta.resolve("@aidenhoey/agent-ui/styles.css"));\nif ((await stat(cssPath)).size === 0) throw new Error("styles export is empty");\nprocess.stdout.write("packed package import, SSR render, mock subpath, and CSS export passed\\n");\n`,
  );

  await run("npm", ["install", "--ignore-scripts", "--package-lock=false"]);
  await run(path.join(fixtureRoot, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json"]);
  await run("node", ["render.mjs"]);
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
