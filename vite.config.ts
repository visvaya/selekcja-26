import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { headersForPattern } from "./scripts/static-headers.mjs";

// `vite preview`, which the browser journeys run against, sends the production headers from
// public/_headers, so a Content-Security-Policy violation fails the journeys before a deploy.
const productionHeaders = headersForPattern(
  readFileSync(new URL("./public/_headers", import.meta.url), "utf8"),
  "/*",
);

export default defineConfig({
  base: "/",
  build: { outDir: "dist", emptyOutDir: true },
  preview: { headers: productionHeaders },
});
