import { createRoot } from "react-dom/client";
import { addCollection } from "@iconify/react";
import { useHass } from "@hakit/core";
import App from "./App.tsx";
import icons from "./icons.json";

// the wall's own icons and the kit's common ones, bundled at build time (scripts/icons.mjs): no request to
// api.iconify.design for them, so the round buttons are never empty circles when that service is slow or blocked
addCollection(icons as Parameters<typeof addCollection>[0]);

// Home Assistant's connection library hands over the whole state map on every change, with the unchanged entities as
// the same objects. The kit's own setter merges it into its old map after comparing every entity twice as JSON (milliseconds
// per change in a big house) and never drops an entity that has gone. Take the map as it is. The kit reads this setter
// from its store when it connects, so it is replaced here, before the first render.
useHass.setState({
  setEntities: (entities: Record<string, unknown>) => useHass.setState({ entities, lastUpdated: Date.now(), ready: true } as never),
} as never);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Inside Home Assistant's sidebar the page is an iframe on Home Assistant's own connection, and leaving the panel removes
// the iframe without unmounting the app, which would leave its subscriptions on that connection for as long as the page
// lives. Unmount on the way out, so they are all released.
if (window.top !== window) addEventListener("pagehide", () => root.unmount(), { once: true });
