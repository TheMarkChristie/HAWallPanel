// The icons the wall draws, bundled: every mdi: name in the wall's own code and in the kit's cards, taken from the
// Material Design Icons set into src/icons.json, which main.tsx registers before the first render. An icon chosen in
// Home Assistant's registries (an entity's own icon) that is not among them is still fetched from Iconify.
//   node scripts/icons.mjs        (run by scripts/build.py before the Vite build)
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getIcons } from "@iconify/utils";

const mdi = JSON.parse(readFileSync(new URL("../node_modules/@iconify-json/mdi/icons.json", import.meta.url), "utf8"));
const names = new Set();

function scan(dir, exts) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      scan(path, exts);
    } else if (exts.some((e) => name.endsWith(e)) && !name.endsWith(".map")) {
      for (const m of readFileSync(path, "utf8").matchAll(/mdi:([a-z0-9]+(?:-[a-z0-9]+)*)/g)) names.add(m[1]);
    }
  }
}

scan("src", [".ts", ".tsx"]);
scan("node_modules/@hakit/components/dist", [".js"]);
const known = [...names].filter((n) => mdi.icons[n] || (mdi.aliases && mdi.aliases[n]));
const subset = getIcons(mdi, known);
writeFileSync("src/icons.json", JSON.stringify(subset));
console.log(`icons: ${Object.keys(subset.icons).length} bundled (${names.size} names found, ${names.size - known.length} not in the set)`);
