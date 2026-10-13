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

// base "./": the built page is served by the integration from /wall_panel/, so every asset path stays relative
export default defineConfig({
  base: "./",
  plugins: [onlyHouseholdLocales(), react({ jsxImportSource: "@emotion/react" })],
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 4000, sourcemap: false },
  server: { port: 5199 },
});
