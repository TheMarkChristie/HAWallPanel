/* The wall's own words in English and Norwegian bokmål. The kit's cards translate themselves from the user's language;
 * these follow the same language: the user's own choice in their Home Assistant profile, else the server's, else the
 * browser's. `setLanguage` is called by the wall as the language becomes known; `t` works anywhere after that. */

const en = {
  connecting: "Connecting to Home Assistant...",
  reconnecting: "Reconnecting to Home Assistant...",
  reconnectingHint: "The wall tries again by itself.",
  notConnected: "Not connected to Home Assistant",
  failed: (what: string) => `That did not work: ${what}`,
  tabs: "Wall tabs",
  tasks: "Tasks",
  security: "Security",
  edit: "Edit",
  editHint: "Edit where devices live",
  homeTab: (tab: string) => `Make ${tab} the home tab on this screen`,
  away: "Away",
  unknown: "Unknown",
  nothingOnFloor: "Nothing on this floor yet. Give devices a room on this floor in Home Assistant, or move one here in Edit.",
  lightsOn: (n: number) => `${n} ${n === 1 ? "light" : "lights"} on`,
  allOff: (n: number) => `${n} ${n === 1 ? "device" : "devices"}, all off`,
  roomLabel: (room: string, n: number) => `${room}, ${n} ${n === 1 ? "device" : "devices"}`,
  onOff: (name: string, on: boolean) => `${name}: ${on ? "on" : "off"}`,
  moreIn: (n: number, room: string) => `${n} more in ${room}`,
  alsoHere: "Also here",
  close: "Close",
  cancel: "Cancel",
  unlock: "Unlock",
  unlockAsk: (name: string) => `Unlock ${name}?`,
  power: (name: string) => `${name}: power`,
  playPause: "Play or pause",
  volumeDown: "Volume down",
  volumeUp: "Volume up",
  noFamilyBoard: 'Chores and lists come from the Family Board integration. Install it, or give a device the "Wall: Tasks" label.',
  choresToday: "Chores today",
  lists: "Lists",
  pointsWeek: (n: number) => `${n} ${n === 1 ? "point" : "points"} this week`,
  nothingToday: "Nothing to do today",
  overdue: "Overdue",
  today: "Today",
  pt: (n: number) => `${n} pt`,
  open: (n: number) => `${n} open`,
  more: (n: number) => `+${n} more`,
  addItem: "Add an item",
  addTo: (list: string) => `Add to ${list}`,
  add: "Add",
  markDone: (title: string) => `Mark ${title} done`,
  locks: "Locks",
  alarm: "Alarm",
  openings: "Doors and windows",
  alarms: "Smoke, gas and leaks",
  presence: "Motion and presence",
  cameras: "Cameras",
  noSecurity: 'No locks, doors or cameras with a room in this house yet. Anything can be moved here with the "Wall: Security" label.',
  toCheck: (n: number) => `${n} to check`,
  allSecure: "All locked and shut",
  issue: {
    unlocked: (n: string) => `${n} unlocked`, open: (n: string) => `${n} open`, jammed: (n: string) => `${n} jammed`,
    smoke: (n: string) => `Smoke: ${n}`, gas: (n: string) => `Gas: ${n}`, carbon_monoxide: (n: string) => `Carbon monoxide: ${n}`,
    moisture: (n: string) => `Leak: ${n}`, safety: (n: string) => `Unsafe: ${n}`, tamper: (n: string) => `Tampering: ${n}`,
    triggered: (n: string) => `Alarm going off: ${n}`,
  } as Record<string, (n: string) => string>,
  state: {
    on: "On", off: "Off", open: "Open", closed: "Closed", detected: "Detected", clear: "Clear", wet: "Wet", dry: "Dry",
    unsafe: "Unsafe", safe: "Safe", tampering: "Tampering", locked: "Locked", unlocked: "Unlocked", locking: "Locking",
    unlocking: "Unlocking", jammed: "Jammed", playing: "Playing", paused: "Paused", idle: "Idle", standby: "Standby",
    unavailable: "Unavailable", unknown: "Unknown", docked: "Docked", cleaning: "Cleaning", returning: "Returning", mowing: "Mowing",
    heat: "Heating", cool: "Cooling", auto: "Auto", home: "Home", not_home: "Away", armed_away: "Armed away",
    armed_home: "Armed home", armed_night: "Armed night", disarmed: "Disarmed", triggered: "Triggered",
  } as Record<string, string>,
  editTitle: "Where each device lives",
  editIntro: 'Automatic follows the room\'s floor; locks, doors and cameras go to Security. A choice here is saved as a "Wall:" label on the device in Home Assistant, where it can be changed too.',
  find: "Find a device or room",
  notOnWall: "Not on the wall",
  noRoom: "No room",
  automatic: "Automatic",
  hidden: "Hidden",
  homeFor: (name: string) => `Home tab for ${name}`,
  why: {
    label: "set by a Wall label", type: "Security by type", floor: "by its room's floor", "no-room": "no room in this house",
    "no-floor": "its room has no floor", hidden: "hidden by a Wall label", player: "another way into a TV the Cast player shows",
  } as Record<string, string>,
  batteries: "Batteries",
  allAbove: (n: number) => `All above ${n}%`,
  lowAverage: (n: number, avg: number) => `${n} low · average ${avg}%`,
  condition: {
    "clear-night": "Clear", cloudy: "Cloudy", fog: "Fog", hail: "Hail", lightning: "Thunder", "lightning-rainy": "Thunder showers",
    partlycloudy: "Partly cloudy", pouring: "Heavy rain", rainy: "Rain", snowy: "Snow", "snowy-rainy": "Sleet", sunny: "Sunny",
    windy: "Windy", "windy-variant": "Windy", exceptional: "Warning",
  } as Record<string, string>,
};

type Strings = typeof en;

const nb: Strings = {
  connecting: "Kobler til Home Assistant...",
  reconnecting: "Kobler til Home Assistant igjen...",
  reconnectingHint: "Veggen prøver igjen av seg selv.",
  notConnected: "Ikke koblet til Home Assistant",
  failed: (what) => `Det gikk ikke: ${what}`,
  tabs: "Faner",
  tasks: "Oppgaver",
  security: "Sikkerhet",
  edit: "Rediger",
  editHint: "Rediger hvor enhetene hører til",
  homeTab: (tab) => `Gjør ${tab} til startfanen på denne skjermen`,
  away: "Borte",
  unknown: "Ukjent",
  nothingOnFloor: "Ingenting i denne etasjen ennå. Gi enheter et rom i denne etasjen i Home Assistant, eller flytt en hit under Rediger.",
  lightsOn: (n) => `${n} ${n === 1 ? "lys" : "lys"} på`,
  allOff: (n) => `${n} ${n === 1 ? "enhet" : "enheter"}, alt av`,
  roomLabel: (room, n) => `${room}, ${n} ${n === 1 ? "enhet" : "enheter"}`,
  onOff: (name, on) => `${name}: ${on ? "på" : "av"}`,
  moreIn: (n, room) => `${n} til i ${room}`,
  alsoHere: "Også her",
  close: "Lukk",
  cancel: "Avbryt",
  unlock: "Lås opp",
  unlockAsk: (name) => `Låse opp ${name}?`,
  power: (name) => `${name}: av/på`,
  playPause: "Spill av eller pause",
  volumeDown: "Lavere volum",
  volumeUp: "Høyere volum",
  noFamilyBoard: 'Husarbeid og lister kommer fra Family Board-integrasjonen. Installer den, eller gi en enhet etiketten "Wall: Tasks".',
  choresToday: "Husarbeid i dag",
  lists: "Lister",
  pointsWeek: (n) => `${n} poeng denne uka`,
  nothingToday: "Ingenting å gjøre i dag",
  overdue: "Forfalt",
  today: "I dag",
  pt: (n) => `${n} p`,
  open: (n) => `${n} åpne`,
  more: (n) => `+${n} til`,
  addItem: "Legg til noe",
  addTo: (list) => `Legg til i ${list}`,
  add: "Legg til",
  markDone: (title) => `Merk ${title} som gjort`,
  locks: "Låser",
  alarm: "Alarm",
  openings: "Dører og vinduer",
  alarms: "Røyk, gass og lekkasje",
  presence: "Bevegelse og tilstedeværelse",
  cameras: "Kameraer",
  noSecurity: 'Ingen låser, dører eller kameraer med et rom i dette huset ennå. Alt kan flyttes hit med etiketten "Wall: Security".',
  toCheck: (n) => `${n} å sjekke`,
  allSecure: "Alt låst og lukket",
  issue: {
    unlocked: (n) => `${n} ulåst`, open: (n) => `${n} åpen`, jammed: (n) => `${n} har satt seg fast`,
    smoke: (n) => `Røyk: ${n}`, gas: (n) => `Gass: ${n}`, carbon_monoxide: (n) => `Kullos: ${n}`,
    moisture: (n) => `Lekkasje: ${n}`, safety: (n) => `Ikke trygt: ${n}`, tamper: (n) => `Sabotasje: ${n}`,
    triggered: (n) => `Alarmen går: ${n}`,
  },
  state: {
    on: "På", off: "Av", open: "Åpen", closed: "Lukket", detected: "Oppdaget", clear: "Klar", wet: "Vått", dry: "Tørt",
    unsafe: "Ikke trygt", safe: "Trygt", tampering: "Sabotasje", locked: "Låst", unlocked: "Ulåst", locking: "Låser",
    unlocking: "Låser opp", jammed: "Satt seg fast", playing: "Spiller", paused: "Pause", idle: "Ledig", standby: "Hvilemodus",
    unavailable: "Utilgjengelig", unknown: "Ukjent", docked: "I dokken", cleaning: "Rengjør", returning: "På vei hjem",
    mowing: "Klipper", heat: "Varmer", cool: "Kjøler", auto: "Auto", home: "Hjemme", not_home: "Borte",
    armed_away: "Aktivert borte", armed_home: "Aktivert hjemme", armed_night: "Aktivert natt", disarmed: "Deaktivert",
    triggered: "Utløst",
  },
  editTitle: "Hvor hver enhet hører til",
  editIntro: 'Automatisk følger rommets etasje; låser, dører og kameraer går til Sikkerhet. Et valg her lagres som en "Wall:"-etikett på enheten i Home Assistant, der den også kan endres.',
  find: "Finn en enhet eller et rom",
  notOnWall: "Ikke på veggen",
  noRoom: "Uten rom",
  automatic: "Automatisk",
  hidden: "Skjult",
  homeFor: (name) => `Startfane for ${name}`,
  why: {
    label: "satt av en Wall-etikett", type: "Sikkerhet etter type", floor: "etter rommets etasje", "no-room": "uten rom i dette huset",
    "no-floor": "rommet har ingen etasje", hidden: "skjult av en Wall-etikett", player: "en annen vei inn til en TV Cast-spilleren viser",
  },
  batteries: "Batterier",
  allAbove: (n) => `Alle over ${n} %`,
  lowAverage: (n, avg) => `${n} lave · snitt ${avg} %`,
  condition: {
    "clear-night": "Klart", cloudy: "Skyet", fog: "Tåke", hail: "Hagl", lightning: "Torden", "lightning-rainy": "Tordenbyger",
    partlycloudy: "Delvis skyet", pouring: "Kraftig regn", rainy: "Regn", snowy: "Snø", "snowy-rainy": "Sludd", sunny: "Sol",
    windy: "Vind", "windy-variant": "Vind", exceptional: "Varsel",
  },
};

let current: Strings = pick(typeof navigator === "undefined" ? "en" : navigator.language);
let currentLang = typeof navigator === "undefined" ? "en" : navigator.language;

function pick(language: string | undefined): Strings {
  return /^(nb|nn|no)\b/i.test(language ?? "") ? nb : en;
}

/** The wall's language (a BCP 47 tag such as "nb" or "en-GB"); returns whether it changed. */
export function setLanguage(language: string | undefined): boolean {
  const next = language || currentLang;
  if (next === currentLang) return false;
  currentLang = next;
  current = pick(next);
  return true;
}

export const language = () => currentLang;

/** The words in the wall's current language. */
export const t = (): Strings => current;

/** A tab's title: a floor by its own name, Tasks and Security in the wall's language. */
export const tabTitle = (tab: { kind: string; title: string }) =>
  (tab.kind === "tasks" ? current.tasks : tab.kind === "security" ? current.security : tab.title);
