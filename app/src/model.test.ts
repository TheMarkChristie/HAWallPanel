// The wall's rules: node --test src/model.test.ts (Node 24 strips the types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTabs, place, roomsOf, readings, initialsFor, tabOfLabel, relabel, shortName, decodeEntities, roomIcon, SECURITY, TASKS, HIDDEN,
  type PlaceInput,
} from "./model.ts";

const floors = [
  { floor_id: "lower_floor", name: "Lower floor", level: -1 },
  { floor_id: "entrance_floor", name: "Entrance floor", level: 0 },
];
const tabs = buildTabs(floors);

function house(): PlaceInput {
  return {
    tabs,
    areas: {
      hall: { area_id: "hall", name: "Hall", floor_id: "entrance_floor" },
      living_room: { area_id: "living_room", name: "Living Room", floor_id: "entrance_floor" },
      lower_hall: { area_id: "lower_hall", name: "Lower hall", floor_id: "lower_floor" },
      shed: { area_id: "shed", name: "Shed", floor_id: null },
    },
    devices: {
      door: { id: "door", name: "Inngangsdør", name_by_user: null, area_id: "hall", labels: [] },
      scot: { id: "scot", name: "Front Door", name_by_user: null, area_id: null, labels: [] },
      lamp: { id: "lamp", name: "Living Room Lamp", name_by_user: null, area_id: "living_room", labels: [] },
      tv: { id: "tv", name: "77&quot; OLED", name_by_user: null, area_id: "living_room", labels: ["l_lower"] },
      vac: { id: "vac", name: "RockeRob", name_by_user: null, area_id: "living_room", labels: ["l_hide"] },
      sensor: { id: "sensor", name: "Hall sensor", name_by_user: null, area_id: "hall", labels: [] },
      shedlamp: { id: "shedlamp", name: "Shed lamp", name_by_user: null, area_id: "shed", labels: [] },
      off: { id: "off", name: "Off lamp", name_by_user: null, area_id: "hall", labels: [], disabled_by: "user" },
    },
    entities: {
      "lock.door": { entity_id: "lock.door", device_id: "door", labels: [] },
      "binary_sensor.door": { entity_id: "binary_sensor.door", device_id: "door", labels: [] },
      "button.door_wake": { entity_id: "button.door_wake", device_id: "door", labels: [] },
      "lock.scotland": { entity_id: "lock.scotland", device_id: "scot", labels: [] },
      "light.lamp": { entity_id: "light.lamp", device_id: "lamp", labels: [] },
      "switch.lamp_child_lock": { entity_id: "switch.lamp_child_lock", device_id: "lamp", labels: [], entity_category: "config" },
      "media_player.tv": { entity_id: "media_player.tv", device_id: "tv", labels: [] },
      "vacuum.rob": { entity_id: "vacuum.rob", device_id: "vac", labels: [] },
      "sensor.hall_t": { entity_id: "sensor.hall_t", device_id: "sensor", labels: [] },
      "sensor.hall_h": { entity_id: "sensor.hall_h", device_id: "sensor", labels: [] },
      "light.shed": { entity_id: "light.shed", device_id: "shedlamp", labels: [] },
      "light.off": { entity_id: "light.off", device_id: "off", labels: [] },
      "light.hidden": { entity_id: "light.hidden", labels: [], hidden: true, area_id: "hall" },
      "scene.evening": { entity_id: "scene.evening", labels: ["l_tasks"] },
    },
    states: {
      "lock.door": { entity_id: "lock.door", state: "locked", attributes: {} },
      "binary_sensor.door": { entity_id: "binary_sensor.door", state: "off", attributes: { device_class: "door" } },
      "button.door_wake": { entity_id: "button.door_wake", state: "unknown", attributes: {} },
      "lock.scotland": { entity_id: "lock.scotland", state: "unlocked", attributes: {} },
      "light.lamp": { entity_id: "light.lamp", state: "on", attributes: {} },
      "switch.lamp_child_lock": { entity_id: "switch.lamp_child_lock", state: "off", attributes: {} },
      "media_player.tv": { entity_id: "media_player.tv", state: "off", attributes: {} },
      "vacuum.rob": { entity_id: "vacuum.rob", state: "docked", attributes: {} },
      "sensor.hall_t": { entity_id: "sensor.hall_t", state: "20.46", attributes: { device_class: "temperature", unit_of_measurement: "°C" } },
      "sensor.hall_h": { entity_id: "sensor.hall_h", state: "44.6", attributes: { device_class: "humidity", unit_of_measurement: "%" } },
      "light.shed": { entity_id: "light.shed", state: "off", attributes: {} },
      "light.off": { entity_id: "light.off", state: "off", attributes: {} },
      "light.hidden": { entity_id: "light.hidden", state: "off", attributes: {} },
      "scene.evening": { entity_id: "scene.evening", state: "unknown", attributes: {} },
    },
    labels: {
      l_lower: { label_id: "l_lower", name: "Wall: Lower floor" },
      l_hide: { label_id: "l_hide", name: "Wall: Hidden" },
      l_tasks: { label_id: "l_tasks", name: "Wall:Tasks" },
      other: { label_id: "other", name: "Kitchen stuff" },
    },
  };
}

const byKey = (input: PlaceInput) => Object.fromEntries(place(input).map((p) => [p.key, p]));

test("tabs are the floors highest first, then Tasks and Security", () => {
  assert.deepEqual(tabs.map((t) => t.key), ["entrance_floor", "lower_floor", TASKS, SECURITY]);
  assert.equal(tabs[0].title, "Entrance floor");
});

test("a device lives on its room's floor", () => {
  const p = byKey(house());
  assert.equal(p.lamp.tab, "entrance_floor");
  assert.equal(p.lamp.why, "floor");
  assert.deepEqual(p.lamp.entities, ["light.lamp"], "the settings switch is not shown");
});

test("locks and door sensors go to Security, the lock as the device's face", () => {
  const p = byKey(house());
  assert.equal(p.door.tab, SECURITY);
  assert.equal(p.door.why, "type");
  assert.equal(p.door.primary, "lock.door");
  assert.deepEqual(p.door.entities, ["lock.door", "binary_sensor.door"], "the wake button is not shown");
});

test("a device with no room in this house is not shown (the other house's lock)", () => {
  const p = byKey(house());
  assert.equal(p.scot.tab, null);
  assert.equal(p.scot.why, "no-room");
});

test("a Wall label moves a device, Wall: Hidden takes it off, and labels match loosely", () => {
  const p = byKey(house());
  assert.equal(p.tv.tab, "lower_floor");
  assert.equal(p.tv.why, "label");
  assert.equal(p.tv.name, '77" OLED');
  assert.equal(p.vac.tab, null);
  assert.equal(p.vac.why, "hidden");
  assert.equal(p["scene.evening"].tab, TASKS, "an entity without a device and without a room, placed by its label");
});

test("a room without a floor keeps its devices off the floor tabs; hidden and disabled things never show", () => {
  const p = byKey(house());
  assert.equal(p.shedlamp.tab, null);
  assert.equal(p.shedlamp.why, "no-floor");
  assert.equal(p.off, undefined);
  assert.equal(p["light.hidden"], undefined);
});

test("rooms of a floor tab, with the room's readings", () => {
  const input = house();
  const rooms = roomsOf("entrance_floor", place(input), input);
  assert.deepEqual(rooms.map((r) => r.area.name), ["Hall", "Living Room"]);
  const hall = rooms.find((r) => r.area.area_id === "hall")!;
  assert.equal(hall.temperature, "20.5°C");
  assert.equal(hall.humidity, "45%");
});

test("labels: reading a wall label, and rewriting a device's labels for a new tab", () => {
  const input = house();
  assert.equal(tabOfLabel(input.labels.l_lower, tabs), "lower_floor");
  assert.equal(tabOfLabel(input.labels.l_hide, tabs), HIDDEN);
  assert.equal(tabOfLabel(input.labels.other, tabs), null);
  assert.equal(tabOfLabel({ label_id: "x", name: "Wall: Attic" }, tabs), null, "a floor that does not exist");
  assert.deepEqual(relabel(["other", "l_lower"], SECURITY, input.labels, "l_sec"), ["other", "l_sec"]);
  assert.deepEqual(relabel(["other", "l_lower"], null, input.labels, null), ["other"], "automatic: wall labels removed");
});

test("names and icons", () => {
  assert.equal(shortName("Living Room TV", "Living Room"), "TV");
  assert.equal(shortName("TV", "Living Room"), "TV");
  assert.equal(decodeEntities("77&quot; OLED"), '77" OLED');
  assert.equal(roomIcon({ area_id: "k", name: "Kitchen" }), "mdi:silverware-fork-knife");
  assert.equal(roomIcon({ area_id: "n", name: "Nicolai Room" }), "mdi:teddy-bear");
  assert.equal(roomIcon({ area_id: "x", name: "Mystery", icon: "mdi:star" }), "mdi:star");
});

test("a machine's temperature is not the room's; a thermostat's reading is", () => {
  const input = house();
  input.devices.printer = { id: "printer", name: "K2", name_by_user: null, area_id: "living_room", labels: [] };
  input.entities["light.k2"] = { entity_id: "light.k2", device_id: "printer", labels: [] };
  input.entities["sensor.k2_nozzle"] = { entity_id: "sensor.k2_nozzle", device_id: "printer", labels: [] };
  input.states["light.k2"] = { entity_id: "light.k2", state: "on", attributes: {} };
  input.states["sensor.k2_nozzle"] = { entity_id: "sensor.k2_nozzle", state: "50.2", attributes: { device_class: "temperature", unit_of_measurement: "°C" } };
  assert.equal(readings("living_room", input).temperature, undefined, "the printer's nozzle is not the living room");
  input.entities["climate.lr"] = { entity_id: "climate.lr", area_id: "living_room", labels: [] };
  input.states["climate.lr"] = { entity_id: "climate.lr", state: "heat", attributes: { current_temperature: 21.3 } };
  assert.equal(readings("living_room", input).temperature, "21.3°C");
});

test("initials grow until they differ", () => {
  assert.deepEqual(initialsFor(["Mark", "Malin", "Nicolai"]), ["Mar", "Mal", "N"]);
  assert.deepEqual(initialsFor(["Ann Karin", "Bob"]), ["AK", "B"]);
});

test("an appliance probe hotter than a room is not the room's temperature", () => {
  const input = house();
  input.devices.fryer = { id: "fryer", name: "Airfryer", name_by_user: null, area_id: "living_room", labels: [] };
  input.entities["sensor.fryer_t"] = { entity_id: "sensor.fryer_t", device_id: "fryer", labels: [] };
  input.states["sensor.fryer_t"] = { entity_id: "sensor.fryer_t", state: "200", attributes: { device_class: "temperature", unit_of_measurement: "°C" } };
  assert.equal(readings("living_room", input).temperature, undefined);
});
