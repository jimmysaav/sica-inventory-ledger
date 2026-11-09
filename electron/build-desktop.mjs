import { build as viteBuild } from "vite";
import { build as bundle } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";

// This is the standalone desktop build only, never the Lovable Start/web build.
await viteBuild({ configFile: path.resolve("electron/vite.desktop.config.ts") });
await fs.mkdir("electron/dist/main", { recursive: true });
await bundle({ entryPoints: ["electron/service.ts"], outfile: "electron/dist/main/service.cjs", bundle: true, platform: "node", target: "node22", format: "cjs" });
await fs.copyFile("node_modules/sql.js/dist/sql-wasm.js", "electron/dist/main/sql-wasm.cjs");
await fs.copyFile("node_modules/sql.js/dist/sql-wasm.wasm", "electron/dist/main/sql-wasm.wasm");
console.log("Desktop-only output ready.");