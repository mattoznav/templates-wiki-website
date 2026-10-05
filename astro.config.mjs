import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

// Where scripts/fetch-data.mjs writes its JSON; read by src/lib/data.ts at build time
process.env.WIKI_DATA_DIR ??= fileURLToPath(new URL("./.cache/data", import.meta.url));

export default defineConfig({
  // Replace with the real domain before going live
  site: "https://wiki.example.com",
  server: { port: 4323 },
  integrations: [sitemap()],
  // Keep demos clean when showing the template
  devToolbar: { enabled: false },
  build: { concurrency: 4 },
});
