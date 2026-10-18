import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Home Assistant's interface text ships in about sixty languages inside @hakit/core (one file each, loaded on demand,
// some 17 MB together). The household reads English and Norwegian: every other language is pointed at the English
// file, so a user set to another language sees English in the kit's own labels, and the package stays small.
const KEEP_LOCALES = new Set(["en", "en-GB", "nb", "nn"]);
const LOCALE_FILE = /[\\/]useLocale[\\/]locales[\\/]([A-Za-z0-9-]+)[\\/]([A-Za-z0-9-]+)\.js$/;

function onlyHouseholdLocales(): Plugin {
  return {
    name: "wall-panel-household-locales",
    enforce: "pre",
    load(id) {
      const path = id.split("?")[0];
      const m = LOCALE_FILE.exec(path);
      if (!m || m[1] !== m[2] || KEEP_LOCALES.has(m[1])) return null;
      const english = path.slice(0, path.length - `${m[1]}/${m[2]}.js`.length) + "en/en.js";
      return `export { default } from ${JSON.stringify(english.replace(/\\/g, "/"))};`;
    },
  };
}

const stub = (file: string) => fileURLToPath(new URL(`./src/stubs/${file}`, import.meta.url));
const version = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version as string;

// base "./": the built page is served by the integration from /wall_panel/, so every asset path stays relative.
// The kit's shared chunk imports leaflet and react-leaflet (its map card), autolinker (its calendar card) and the whole of
// CommonJS lodash at module level; the wall uses neither card, so those are stand-ins and lodash is the ES build, which
// leaves only what is used (about a quarter of the main chunk less).
export default defineConfig({
  base: "./",
  plugins: [onlyHouseholdLocales(), react({ jsxImportSource: "@emotion/react" })],
  resolve: {
    alias: [
      { find: /^leaflet$/, replacement: stub("leaflet.ts") },
      { find: /^react-leaflet$/, replacement: stub("react-leaflet.tsx") },
      { find: /^autolinker$/, replacement: stub("autolinker.ts") },
      { find: /^lodash$/, replacement: "lodash-es" },
    ],
  },
  define: { __WALL_VERSION__: JSON.stringify(version) },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 4000, sourcemap: false },
  server: { port: 5199 },
});
