import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve("electron/renderer"), base: "./",
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": path.resolve("src") } },
  build: { outDir: path.resolve("electron/dist"), emptyOutDir: true, target: "chrome140" },
});