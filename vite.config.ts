import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import {
  expectedHeaders,
  parseHeadersFile,
} from "./scripts/static-headers.mjs";

// `vite preview`, which the browser journeys run against, sends the production headers from
// public/_headers for each path, so a Content-Security-Policy violation fails the journeys and
// e2e/headers.spec.ts checks every rule before a deploy.
const headerRules = parseHeadersFile(
  readFileSync(new URL("./public/_headers", import.meta.url), "utf8"),
);

export default defineConfig({
  base: "/",
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [
    {
      name: "production-headers",
      // Runs before the static file handler, which keeps headers already set on the response.
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          const { pathname } = new URL(request.url ?? "/", "http://preview");
          for (const [name, value] of Object.entries(
            expectedHeaders(headerRules, pathname),
          )) {
            response.setHeader(name, value);
          }
          next();
        });
      },
    },
  ],
});
