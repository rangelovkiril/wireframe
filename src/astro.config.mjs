import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  site: "https://portfolio.rangelov.dev",
  output: "static",
  // This directory is the Astro root and holds pages/, components/, data/
  // directly (no nested src/), as AGENTS.md lays out.
  srcDir: ".",
  // Downloaded at build time and served from this site.
  fonts: [
    {
      name: "Hanken Grotesk",
      cssVariable: "--font-hanken",
      provider: fontProviders.fontsource(),
      weights: [400, 500, 700, 800, 900],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
    {
      name: "Sometype Mono",
      cssVariable: "--font-sometype",
      provider: fontProviders.fontsource(),
      weights: [400, 500, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["monospace"],
    },
  ],
});
