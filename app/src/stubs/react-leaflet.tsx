// Stand-in for react-leaflet (vite.config.ts aliases it here): the kit wraps MapContainer with styled() when it loads,
// so these must be components; the wall never shows a map, so they draw nothing.
export const MapContainer = () => null;
export const TileLayer = () => null;
export const Marker = () => null;
