import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://portfolio.rangelov.dev",
  output: "static",
  // This directory is the Astro root and holds pages/, components/, data/
  // directly (no nested src/), as AGENTS.md lays out.
  srcDir: ".",
});
