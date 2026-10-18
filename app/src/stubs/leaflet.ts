// Stand-in for leaflet (vite.config.ts aliases it here): the kit's map card imports it at module level, and the wall
// never shows a map, so its 150 kB stay out of the page. Only what the map card would touch is here.
export const DomUtil = { create: () => document.createElement("div"), remove: () => undefined };
export class LatLng {
  lat: number;
  lng: number;
  constructor(lat = 0, lng = 0) { this.lat = lat; this.lng = lng; }
}
export class DivIcon {
  options: unknown;
  constructor(options?: unknown) { this.options = options; }
}
export default { DomUtil, LatLng, DivIcon };
