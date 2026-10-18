/*
 * The wall's rules, with no React in them: which tabs exist, which devices are shown, and which tab each device lives
 * on. Tested on their own with `npm test` (Node's test runner).
 *
 * Tabs: one per floor of the house (highest level first), then Tasks, then Security.
 * A device's home tab, first match wins:
 *   1. a label on the device (or one of its entities) named "Wall: <tab>": "Wall: Lower floor", "Wall: Security",
 *      "Wall: Tasks", or "Wall: Hidden" to keep it off the wall;
 *   2. no room in this house: not shown (another house's device seen through a shared cloud account, such as
 *      Scotland's Yale locks in the Norway Home Assistant);
 *   3. a lock, alarm panel, camera or door/window/motion/smoke sensor: Security;
 *   4. otherwise the floor of its room.
 * A TV's tile is its Google Cast player: the Android TV players (Android TV Remote, the Android Debug Bridge) are other
 * ways into the same box and are not shown unless a "Wall: ..." label asks for them. A device with more than one thing
 * to work (a two-gang switch, a fan with a light) gets a tile for each.
 */

export const LABEL_PREFIX = "wall:";
export const TASKS = "tasks";
export const SECURITY = "security";
export const HIDDEN = "hidden";

export interface FloorLite { floor_id: string; name: string; level?: number | null; icon?: string | null }
export interface AreaLite { area_id: string; name: string; floor_id?: string | null; icon?: string | null }
export interface LabelLite { label_id: string; name: string }
export interface DeviceLite {
  id: string;
  name: string | null;
  name_by_user: string | null;
  area_id: string | null;
  labels: string[];
  disabled_by?: string | null;
  entry_type?: string | null;
}
export interface EntityRegLite {
  entity_id: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  entity_category?: string;
  name?: string;
  platform?: string;
}
export interface StateLite { entity_id: string; state: string; attributes: Record<string, unknown> }

export type TabKind = "floor" | "tasks" | "security";
export interface Tab { key: string; title: string; kind: TabKind; icon: string }

export type Why = "label" | "type" | "floor" | "no-room" | "no-floor" | "hidden";
export interface Placed {
  key: string;               // the device id (or the entity id for an entity without a device); "<device>#<entity>"
                             // for the second and later controls of a device that has several
  deviceId: string | null;
  name: string;
  areaId: string | null;
  entities: string[];        // the shown entities, the primary one first
  primary: string;
  domain: string;            // the primary entity's domain
  security: boolean;         // a lock, alarm, camera or security sensor
  tab: string | null;        // null: not on the wall
  why: Why;
}

/** The domains a device can be shown by, best first: the first one present is its primary entity. */
export const DOMAIN_ORDER = [
  "climate", "light", "cover", "fan", "lock", "alarm_control_panel", "camera", "media_player", "vacuum", "lawn_mower",
  "water_heater", "humidifier", "valve", "switch", "scene", "script", "binary_sensor", "sensor",
];
const SHOWN = new Set(DOMAIN_ORDER);
export const SECURITY_DOMAINS = new Set(["lock", "alarm_control_panel", "camera"]);
export const OPENINGS = new Set(["door", "window", "garage_door", "opening"]);
export const ALARM_SENSORS = new Set(["smoke", "gas", "carbon_monoxide", "moisture", "safety", "tamper"]);
export const PRESENCE = new Set(["motion", "occupancy", "presence"]);
export const SECURITY_SENSORS = new Set([...OPENINGS, ...PRESENCE, ...ALARM_SENSORS, "lock"]);
export const READING_SENSORS = new Set(["temperature", "humidity", "carbon_dioxide", "pm25", "pm10", "volatile_organic_compounds"]);
export const TOGGLE_DOMAINS = new Set(["light", "switch", "fan", "cover", "valve", "humidifier"]);
/** What a person works from a tile: a device with more than one of these gets a tile for each. */
export const CONTROL_DOMAINS = new Set([
  "climate", "light", "cover", "fan", "lock", "alarm_control_panel", "camera", "media_player", "vacuum", "lawn_mower",
  "water_heater", "humidifier", "valve", "switch",
]);
/** Media players that are another way into a box a Cast player shows (Mark, 18 Oct 2026: "Google chromecasts should be
 *  the default options for casting or apps"). */
export const SECONDARY_PLAYER_PLATFORMS = new Set(["androidtv_remote", "androidtv"]);

export const domainOf = (entityId: string) => entityId.split(".", 1)[0];

/** Whether an entity is something to show: not hidden, not a settings or diagnostic entity, and of a shown kind. */
export function isShown(reg: EntityRegLite, state: StateLite | undefined): boolean {
  if (!state || reg.hidden || reg.entity_category) return false;
  const domain = domainOf(reg.entity_id);
  if (!SHOWN.has(domain)) return false;
  const dc = String(state.attributes.device_class ?? "");
  if (domain === "binary_sensor") return SECURITY_SENSORS.has(dc);
  if (domain === "sensor") return READING_SENSORS.has(dc);
  return true;
}

export function isSecurity(entityId: string, state: StateLite | undefined): boolean {
  const domain = domainOf(entityId);
  if (SECURITY_DOMAINS.has(domain)) return true;
  return domain === "binary_sensor" && SECURITY_SENSORS.has(String(state?.attributes.device_class ?? ""));
}

/** The tabs: floors highest first (a floor without a level after those with one), then Tasks and Security. */
export function buildTabs(floors: FloorLite[]): Tab[] {
  const sorted = [...floors].sort((a, b) => {
    const la = a.level ?? Number.NEGATIVE_INFINITY;
    const lb = b.level ?? Number.NEGATIVE_INFINITY;
    return lb - la || a.name.localeCompare(b.name);
  });
  return [
    ...sorted.map((f) => ({ key: f.floor_id, title: f.name, kind: "floor" as const, icon: f.icon || floorIcon(f.level) })),
    { key: TASKS, title: "Tasks", kind: "tasks", icon: "mdi:checkbox-marked-circle-outline" },
    { key: SECURITY, title: "Security", kind: "security", icon: "mdi:shield-home-outline" },
  ];
}

function floorIcon(level: number | null | undefined): string {
  if (level == null) return "mdi:home-floor-0";
  if (level < 0) return "mdi:home-floor-negative-1";
  if (level === 0) return "mdi:home-floor-0";
  return level === 1 ? "mdi:home-floor-1" : level === 2 ? "mdi:home-floor-2" : "mdi:home-floor-3";
}

export const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, " ").trim();

/** The tab a "Wall: ..." label names: a tab key, HIDDEN, or null when the label is not a wall label or names no tab. */
export function tabOfLabel(label: LabelLite | undefined, tabs: Tab[]): string | null {
  if (!label) return null;
  const name = label.name.trim();
  if (!name.toLowerCase().startsWith(LABEL_PREFIX)) return null;
  const rest = norm(name.slice(LABEL_PREFIX.length));
  if (rest === "hidden" || rest === "hide") return HIDDEN;
  for (const t of tabs) {
    if (norm(t.title) === rest || norm(t.key) === rest) return t.key;
  }
  return null;
}

/** The tab a home-tab setting names (a tab key or title, "?home=lower_floor" or "Lower floor"), or null. */
export function tabNamed(name: string | null | undefined, tabs: Tab[]): string | null {
  if (!name) return null;
  const n = norm(name);
  return tabs.find((t) => t.key === name || norm(t.key) === n || norm(t.title) === n)?.key ?? null;
}

/** The label name that puts something on a tab ("Wall: Lower floor"), for creating it when it does not exist. */
export const labelNameFor = (tab: Tab | typeof HIDDEN) => (tab === HIDDEN ? "Wall: Hidden" : `Wall: ${tab.title}`);

export interface PlaceInput {
  tabs: Tab[];
  areas: Record<string, AreaLite>;
  devices: Record<string, DeviceLite>;
  entities: Record<string, EntityRegLite>;
  states: Record<string, StateLite>;
  labels: Record<string, LabelLite>;
}

/** Every device (and every entity without a device) that has something to show, with its tab and the reason for it. */
export function place(input: PlaceInput): Placed[] {
  const { tabs, areas, devices, entities, states, labels } = input;
  const wallTab = (ids: string[]) => ids.map((l) => tabOfLabel(labels[l], tabs)).filter((t): t is string => t !== null);
  const groups = new Map<string, { deviceId: string | null; ids: string[] }>();
  for (const reg of Object.values(entities)) {
    if (!isShown(reg, states[reg.entity_id])) continue;
    const device = reg.device_id ? devices[reg.device_id] : undefined;
    if (device?.disabled_by) continue;
    // another way into a TV: not its tile, unless a wall label puts it somewhere
    if (domainOf(reg.entity_id) === "media_player" && reg.platform && SECONDARY_PLAYER_PLATFORMS.has(reg.platform)
        && !wallTab([...reg.labels, ...(device?.labels ?? [])]).some((t) => t !== HIDDEN)) continue;
    const key = device ? device.id : reg.entity_id;
    const g = groups.get(key) ?? { deviceId: device ? device.id : null, ids: [] };
    g.ids.push(reg.entity_id);
    groups.set(key, g);
  }
  const rank = (id: string) => {
    const r = DOMAIN_ORDER.indexOf(domainOf(id));
    return r < 0 ? DOMAIN_ORDER.length : r;
  };
  const out: Placed[] = [];
  for (const [key, g] of groups) {
    const ids = [...g.ids].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const device = g.deviceId ? devices[g.deviceId] : undefined;
    // a tile per thing to work: the first one carries the device's readings and sensors with it
    const controls = ids.filter((id) => CONTROL_DOMAINS.has(domainOf(id)));
    const parts = controls.length > 1
      ? controls.map((c, i) => (i === 0 ? [c, ...ids.filter((id) => !CONTROL_DOMAINS.has(domainOf(id)))] : [c]))
      : [ids];
    parts.forEach((partIds, i) => {
      const primary = partIds[0];
      const reg = entities[primary];
      const areaId = (reg?.area_id || device?.area_id || null) as string | null;
      const name = parts.length > 1 ? entityName(reg, states[primary], device) : deviceName(device, states[primary], primary);
      const security = partIds.some((id) => isSecurity(id, states[id])) && rank(primary) >= DOMAIN_ORDER.indexOf("lock");
      // labels on the device and on any of this tile's entities
      const fromLabel = wallTab([...new Set([...(device?.labels ?? []), ...partIds.flatMap((id) => entities[id]?.labels ?? [])])]);
      let tab: string | null;
      let why: Why;
      if (fromLabel.includes(HIDDEN)) {
        tab = null; why = "hidden";
      } else if (fromLabel.length) {
        // more than one wall label: the first tab in tab order wins
        tab = tabs.find((t) => fromLabel.includes(t.key))?.key ?? fromLabel[0]; why = "label";
      } else if (!areaId || !areas[areaId]) {
        tab = null; why = "no-room";
      } else if (security) {
        tab = SECURITY; why = "type";
      } else {
        const floorId = areas[areaId].floor_id;
        const onTab = floorId ? tabs.find((t) => t.kind === "floor" && t.key === floorId) : undefined;
        tab = onTab ? onTab.key : null; why = onTab ? "floor" : "no-floor";
      }
      out.push({ key: i === 0 ? key : `${key}#${primary}`, deviceId: g.deviceId, name, areaId, entities: partIds, primary,
                 domain: domainOf(primary), security, tab, why });
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function deviceName(device: DeviceLite | undefined, state: StateLite | undefined, entityId: string): string {
  const raw = device?.name_by_user || device?.name || String(state?.attributes.friendly_name ?? "") || entityId;
  return decodeEntities(raw);
}

/** One control of a device that has several: its own name ("Wall switch Left"). */
function entityName(reg: EntityRegLite | undefined, state: StateLite | undefined, device: DeviceLite | undefined): string {
  const friendly = String(state?.attributes.friendly_name ?? "");
  if (friendly) return decodeEntities(friendly);
  const base = device?.name_by_user || device?.name || "";
  return decodeEntities([base, reg?.name].filter(Boolean).join(" ") || reg?.entity_id || "");
}

/** Names from some integrations arrive HTML-escaped (77&quot; OLED). */
export function decodeEntities(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** A name without its room in front ("Living Room TV" in the Living Room is "TV"). */
export function shortName(name: string, room: string | undefined): string {
  if (room && name.toLowerCase().startsWith(room.toLowerCase() + " ")) return name.slice(room.length + 1);
  return name;
}

export interface Readings { temperature?: string; humidity?: string }
export interface Room extends Readings { area: AreaLite; items: Placed[] }

/** A floor tab's rooms: every room of the floor that has something on this tab, in the area registry's order, with the
 *  room's temperature and humidity (from `byArea`, worked out once for all rooms). */
export function roomsOf(tabKey: string, placed: Placed[], input: Pick<PlaceInput, "areas" | "entities" | "states" | "devices">,
                        byArea?: Map<string, Readings>): Room[] {
  const readingsMap = byArea ?? readingsByArea(input);
  const grouped = new Map<string, Placed[]>();
  for (const p of placed) {
    if (p.tab !== tabKey || !p.areaId) continue;
    const list = grouped.get(p.areaId);
    if (list) list.push(p);
    else grouped.set(p.areaId, [p]);
  }
  const rooms: Room[] = [];
  for (const area of Object.values(input.areas)) {
    const items = grouped.get(area.area_id);
    if (!items) continue;
    rooms.push({ area, items, ...readingsMap.get(area.area_id) });
  }
  return rooms;
}

/** What a floor tab shows outside its rooms: things placed on it by a label that have no room. */
export const roomless = (tabKey: string, placed: Placed[]) => placed.filter((p) => p.tab === tabKey && !p.areaId);

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Every room's temperature and humidity in one pass: a thermostat's own reading first, then plain sensors. A sensor on
 *  a device that also does something (a 3D printer's nozzle, a fridge, a TV) is not the room's temperature, so it is
 *  skipped; a device's settings, diagnostics and hidden entities do not make it such a device (a Hue motion sensor's
 *  settings switches, a thermometer's calibration number). */
export function readingsByArea(input: Pick<PlaceInput, "entities" | "states" | "devices">): Map<string, Readings> {
  const areaOf = (reg: EntityRegLite) => reg.area_id || (reg.device_id ? input.devices[reg.device_id]?.area_id : null);
  const regs = Object.values(input.entities);
  const busy = new Set<string>();
  for (const reg of regs) {
    if (!reg.device_id || reg.entity_category || reg.hidden) continue;
    const d = domainOf(reg.entity_id);
    if (d !== "sensor" && d !== "binary_sensor" && d !== "button" && d !== "update" && d !== "event") busy.add(reg.device_id);
  }
  const out = new Map<string, Readings>();
  const of = (area: string) => {
    let r = out.get(area);
    if (!r) out.set(area, (r = {}));
    return r;
  };
  const fmtT = (v: number, unit?: string) => `${Math.round(v * 10) / 10}${unit || "°C"}`;
  for (const reg of regs) {
    if (reg.hidden || domainOf(reg.entity_id) !== "climate") continue;
    const area = areaOf(reg);
    if (!area) continue;
    const attrs = input.states[reg.entity_id]?.attributes ?? {};
    const r = of(area);
    // a thermostat with no reading writes null, which is no reading, not 0 °C
    if (r.temperature === undefined && finite(attrs.current_temperature)) r.temperature = fmtT(attrs.current_temperature);
    if (r.humidity === undefined && finite(attrs.current_humidity)) r.humidity = `${Math.round(attrs.current_humidity)}%`;
  }
  for (const reg of regs) {
    if (reg.hidden || reg.entity_category || domainOf(reg.entity_id) !== "sensor") continue;
    if (reg.device_id && busy.has(reg.device_id)) continue;
    const area = areaOf(reg);
    if (!area) continue;
    const st = input.states[reg.entity_id];
    if (!st || st.state === "unavailable" || st.state === "unknown") continue;
    const dc = st.attributes.device_class;
    if (dc !== "temperature" && dc !== "humidity") continue;
    const value = Number(st.state);
    if (!Number.isFinite(value)) continue;
    const unit = String(st.attributes.unit_of_measurement ?? "");
    const r = of(area);
    // an indoor reading: an appliance's probe (an air fryer at 200 °C) is not the room
    const celsius = unit === "°F" ? (value - 32) / 1.8 : value;
    if (dc === "temperature" && r.temperature === undefined && celsius >= -5 && celsius <= 40) r.temperature = fmtT(value, unit);
    if (dc === "humidity" && r.humidity === undefined) r.humidity = `${Math.round(value)}${unit || "%"}`;
  }
  return out;
}

/** One room's readings (readingsByArea for all of them at once). */
export function readings(areaId: string, input: Pick<PlaceInput, "entities" | "states" | "devices">): Readings {
  return readingsByArea(input).get(areaId) ?? {};
}

/** The weather to show: one labelled "Wall: Weather", else the home forecast (weather.home, weather.forecast_home), else
 *  one with a room in this house, else the first by id; never the other house's just because it loaded first. */
export function pickWeather(states: Record<string, StateLite>, entities: Record<string, EntityRegLite>,
                            areas: Record<string, AreaLite>, labels: Record<string, LabelLite>,
                            devices: Record<string, DeviceLite> = {}): string | undefined {
  const ids = Object.keys(states).filter((id) => id.startsWith("weather.")).sort();
  if (!ids.length) return undefined;
  const labelled = ids.find((id) => {
    const reg = entities[id];
    const all = [...(reg?.labels ?? []), ...(reg?.device_id ? devices[reg.device_id]?.labels ?? [] : [])];
    return all.some((l) => norm(labels[l]?.name ?? "") === "wall weather");
  });
  if (labelled) return labelled;
  for (const preferred of ["weather.home", "weather.forecast_home"]) if (ids.includes(preferred)) return preferred;
  const inHouse = ids.find((id) => {
    const reg = entities[id];
    const area = reg?.area_id || (reg?.device_id ? devices[reg.device_id]?.area_id : null);
    return !!area && !!areas[area];
  });
  return inHouse ?? ids[0];
}

export type BinaryWord = "open" | "closed" | "detected" | "clear" | "wet" | "dry" | "unsafe" | "safe" | "tampering" | "on" | "off";

/** A binary sensor's state in words by its class, as Home Assistant says it: a door is Open or Closed, not On. */
export function binaryWord(deviceClass: unknown, on: boolean): BinaryWord {
  const dc = String(deviceClass ?? "");
  if (OPENINGS.has(dc)) return on ? "open" : "closed";
  if (dc === "moisture") return on ? "wet" : "dry";
  if (dc === "safety") return on ? "unsafe" : "safe";
  if (dc === "tamper") return on ? "tampering" : "clear";
  if (ALARM_SENSORS.has(dc) || PRESENCE.has(dc)) return on ? "detected" : "clear";
  return on ? "on" : "off";
}

export type IssueKind = "unlocked" | "open" | "jammed" | "smoke" | "gas" | "carbon_monoxide" | "moisture" | "safety" | "tamper" | "triggered";
export interface Issue { kind: IssueKind; name: string }

/** What is not safe or secure right now on the Security tab: an unlocked or jammed lock, an open door or window (a
 *  lock's own door sensor counts), smoke, gas, carbon monoxide, a leak, an unsafe or tampered sensor, an alarm going off. */
export function securityIssues(items: Placed[], states: Record<string, StateLite>): Issue[] {
  const out: Issue[] = [];
  for (const p of items) {
    for (const id of p.entities) {
      const st = states[id];
      if (!st) continue;
      const domain = domainOf(id);
      if (domain === "lock") {
        if (st.state === "unlocked" || st.state === "open") out.push({ kind: "unlocked", name: p.name });
        else if (st.state === "jammed") out.push({ kind: "jammed", name: p.name });
      } else if (domain === "alarm_control_panel" && st.state === "triggered") {
        out.push({ kind: "triggered", name: p.name });
      } else if (domain === "binary_sensor" && st.state === "on") {
        const dc = String(st.attributes.device_class ?? "");
        if (OPENINGS.has(dc)) out.push({ kind: "open", name: p.name });
        else if (ALARM_SENSORS.has(dc)) out.push({ kind: dc as IssueKind, name: p.name });
      }
    }
  }
  return out;
}

/** Initials for a set of names that never collide: Mark and Malin become Mar and Mal, Nicolai stays N. */
export function initialsFor(names: string[]): string[] {
  const words = names.map((n) => n.trim().split(/\s+/).filter(Boolean));
  const out = words.map((w) => (w.length > 1 ? (w[0][0] + w[1][0]).toUpperCase() : (w[0]?.[0] ?? "?").toUpperCase()));
  for (let len = 2; len <= 4; len++) {
    const counts = new Map<string, number>();
    out.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
    if ([...counts.values()].every((c) => c === 1)) break;
    words.forEach((w, i) => {
      if ((counts.get(out[i]) ?? 0) > 1 && w.length === 1) out[i] = w[0][0].toUpperCase() + w[0].slice(1, len).toLowerCase();
    });
  }
  return out;
}

/** The wall labels on a device or entity, and the labels to write so that it lives on `target` (null = automatic). */
export function relabel(current: string[], target: string | null, labels: Record<string, LabelLite>, targetLabelId: string | null): string[] {
  const keep = current.filter((id) => !(labels[id]?.name ?? "").trim().toLowerCase().startsWith(LABEL_PREFIX));
  return target && targetLabelId ? [...keep, targetLabelId] : keep;
}

/** A room's icon from its registry icon, else from its name (English and Norwegian). */
export function roomIcon(area: AreaLite): string {
  if (area.icon) return area.icon;
  const n = area.name.toLowerCase();
  const pick: [RegExp, string][] = [
    [/living|stue/, "mdi:sofa"], [/kitchen|kj.kken/, "mdi:silverware-fork-knife"], [/dining|spise/, "mdi:table-chair"],
    [/office|kontor|study/, "mdi:briefcase-outline"], [/bath|bad|shower/, "mdi:shower"], [/\bwc\b|toilet/, "mdi:toilet"],
    [/laundry|vaske/, "mdi:washing-machine"], [/wardrobe|garderobe/, "mdi:hanger"], [/garage/, "mdi:garage"],
    [/printer|3d/, "mdi:printer-3d"], [/hall|lobby|vestibule|entr|gang/, "mdi:door"], [/nicolai|kid|child|barn/, "mdi:teddy-bear"],
    [/bed|sove|soverom/, "mdi:bed"], [/garden|hage|outside|ute/, "mdi:flower"],
  ];
  for (const [re, icon] of pick) if (re.test(n)) return icon;
  return "mdi:home-outline";
}

/** What place() reads from the states, as one string: whether each candidate entity has a state, its device class and
 *  its name. The wall recomputes where devices live only when this (or a registry) changes, not on every state change. */
export function shownKey(entities: Record<string, EntityRegLite>, states: Record<string, StateLite>): string {
  const parts: string[] = [];
  for (const id in entities) {
    if (!SHOWN.has(domainOf(id))) continue;
    const st = states[id];
    parts.push(st ? `${id}|${String(st.attributes.device_class ?? "")}|${String(st.attributes.friendly_name ?? "")}` : `${id}|-`);
  }
  return parts.join(";");
}
