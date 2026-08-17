import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import packageJson from "./package.json" with { type: "json" };

const dirname = path.dirname(fileURLToPath(import.meta.url));
const external = new Set([
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.peerDependencies),
]);

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: {
        index: path.resolve(dirname, "src/index.ts"),
        "mock/index": path.resolve(dirname, "src/mock/index.ts"),
      },
      formats: ["es"],
      cssFileName: "styles",
    },
    rollupOptions: {
      external: (id) => {
        const packageName = id.startsWith("@") ? id.split("/").slice(0, 2).join("/") : id.split("/")[0];
        return external.has(packageName);
      },
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]"
      }
    }
  }
});
