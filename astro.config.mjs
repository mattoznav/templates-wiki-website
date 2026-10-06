import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

// Where scripts/fetch-data.mjs writes its JSON; read by src/lib/data.ts at build time
process.env.WIKI_DATA_DIR ??= fileURLToPath(new URL("./.cache/data", import.meta.url));

export default defineConfig({
  // Replace with the real domain before going live. The GitHub Pages workflow sets
  // SITE_URL and BASE_PATH to publish the demo under the repository's path.
  site: process.env.SITE_URL ?? "https://wiki.example.com",
  base: process.env.BASE_PATH || "/",
  server: { port: 4323 },
  integrations: [sitemap()],
  // Keep demos clean when showing the template
  devToolbar: { enabled: false },
  build: { concurrency: 4 },
});
