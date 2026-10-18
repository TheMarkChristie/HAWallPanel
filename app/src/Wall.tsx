/* The page: a header with the tabs across the top, the clock, the weather and who is home; under it the chosen tab.
 * On the wall tablet (the page opened on its own) it keeps the screen awake and goes back to this screen's home tab two
 * minutes after the last touch, closing any open sheet; inside Home Assistant's sidebar it does neither. It says when
 * the connection is lost, and picks up a new version of itself after an update. */
import { useCallback, useEffect, useRef, useState } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { useHass } from "@hakit/core";
import { useWall } from "./useWall.ts";
import { FloorTab } from "./FloorTab.tsx";
import { TasksTab } from "./TasksTab.tsx";
import { SecurityTab } from "./SecurityTab.tsx";
import { EditPanel } from "./EditPanel.tsx";
import { colours, glass, WEATHER_ICONS, buttonFont, Notes } from "./ui.tsx";
import { SECURITY, TASKS, tabNamed, type StateLite } from "./model.ts";
import { language, setLanguage, t, tabTitle } from "./i18n.ts";

declare const __WALL_VERSION__: string;

const IDLE_MS = 2 * 60 * 1000;
const TAB_KEY = "wall-panel-tab";            // the tab this visit is on (sessionStorage)
const HOME_KEY = "wall-panel-home";          // this screen's home tab (localStorage), or ?home=<tab> in its address
const RELOADED_KEY = "wall-panel-reloaded";  // the version last reloaded for, and when (a guard against reload loops)
const framed = typeof window !== "undefined" && window.top !== window;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function readHome(): string | null {
  try {
    const fromUrl = new URLSearchParams(location.search).get("home");
    if (fromUrl) {
      localStorage.setItem(HOME_KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(HOME_KEY);
  } catch {
    return null;
  }
}

export function Wall() {
  const wall = useWall();
  const locale = useHass((s) => s.locale) as { language?: string; time_zone?: string } | null;
  const config = useHass((s) => s.config) as { language?: string; time_zone?: string } | null;
  setLanguage(locale?.language || config?.language || navigator.language);   // before the tabs below render
  const connection = useHass((s) => s.connection) as Any;
  const down = useConnectionDown(connection);
  useVersionCheck(connection);
  const [home, setHome] = useState<string | null>(readHome);
  const homeKey = tabNamed(home, wall.tabs);
  const [tab, setTab] = useState<string>(() => {
    try { return sessionStorage.getItem(TAB_KEY) ?? ""; } catch { return ""; }
  });
  const [editing, setEditing] = useState(false);
  const [reset, setReset] = useState(0);       // bumped by the idle return: the tabs start afresh, any sheet closes
  const active = wall.tabs.find((x) => x.key === tab) ?? wall.tabs.find((x) => x.key === homeKey) ?? wall.tabs[0];
  const choose = useCallback((key: string) => {
    setTab(key);
    try { sessionStorage.setItem(TAB_KEY, key); } catch { /* private mode */ }
  }, []);
  const toggleHome = (key: string) => {
    const next = homeKey === key ? null : key;
    setHome(next);
    try { if (next) localStorage.setItem(HOME_KEY, next); else localStorage.removeItem(HOME_KEY); } catch { /* private mode */ }
  };
  useIdleReturn(!framed, () => {
    if (editing) return;
    const target = homeKey ?? wall.tabs[0]?.key;
    if (target) choose(target);
    setReset((n) => n + 1);
  });
  useWakeLock(!framed);
  if (!active) return null;
  const timeZone = locale?.time_zone === "server" && config?.time_zone ? config.time_zone : undefined;
  return (
    <div lang={language()} css={css`max-width: 1680px; margin: 0 auto; padding: 18px 22px 40px;`}>
      <Header wall={wall} activeKey={active.key} onTab={choose} homeKey={homeKey} onHome={toggleHome} timeZone={timeZone}
        onEdit={wall.isAdmin ? () => setEditing(true) : undefined} />
      {down && (
        <div role="status" css={[glass, css`margin-top: 14px; padding: 12px 18px; display: flex; align-items: center; gap: 10px;
          border-color: ${colours.warm};`]}>
          <Icon icon="mdi:lan-disconnect" width={22} css={css`color: ${colours.warm};`} />{t().reconnecting}
        </div>
      )}
      <main css={[css`margin-top: 18px; transition: opacity 0.3s;`, down ? css`opacity: 0.45; pointer-events: none;` : null]}>
        {active.kind === "floor" && <FloorTab key={`${active.key}:${reset}`} tabKey={active.key} wall={wall} />}
        {active.key === TASKS && <TasksTab key={reset} wall={wall} />}
        {active.key === SECURITY && <SecurityTab key={reset} wall={wall} />}
      </main>
      {wall.isAdmin && editing && <EditPanel wall={wall} open onClose={() => setEditing(false)} />}
      <Notes />
    </div>
  );
}

function Header({ wall, activeKey, onTab, homeKey, onHome, onEdit, timeZone }: {
  wall: ReturnType<typeof useWall>; activeKey: string; onTab: (k: string) => void; homeKey: string | null;
  onHome: (k: string) => void; onEdit?: () => void; timeZone?: string;
}) {
  const config = useHass((s) => s.config);
  const joinHassUrl = useHass((s) => s.helpers.joinHassUrl);
  const now = useNow();
  const weather = wall.weather ? wall.states[wall.weather] : undefined;
  const people = Object.values(wall.states).filter((s) => s.entity_id.startsWith("person."));
  const lang = language();
  const time = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(now);
  const date = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long", timeZone }).format(now);
  const words = t();
  const activeTab = wall.tabs.find((x) => x.key === activeKey);
  const isHome = homeKey === activeKey;
  return (
    <header css={css`display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 18px; align-items: center;
      @media (max-width: 900px) { grid-template-columns: 1fr; }`}>
      <div>
        <div css={css`font-size: 40px; font-weight: 750; line-height: 1; letter-spacing: -0.02em;`}>{time}</div>
        <div css={css`color: ${colours.muted}; margin-top: 4px;`}>{date}{config?.location_name ? ` · ${config.location_name}` : ""}</div>
      </div>
      <nav aria-label={words.tabs} css={[glass, css`display: flex; gap: 6px; padding: 6px; border-radius: 18px; overflow-x: auto; justify-self: center; max-width: 100%;`]}>
        {wall.tabs.map((x) => {
          const on = x.key === activeKey;
          return (
            <button key={x.key} onClick={() => onTab(x.key)} aria-current={on ? "page" : undefined} css={css`
              display: flex; align-items: center; gap: 8px; white-space: nowrap; ${buttonFont}; font-weight: 600; padding: 11px 18px;
              border-radius: 13px; border: none; cursor: pointer; color: ${on ? "#0d1022" : colours.text};
              background: ${on ? colours.accent : "transparent"}; transition: background 0.2s;
              &:hover { background: ${on ? colours.accent : colours.glassHi}; }
              &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
            `}>
              <Icon icon={x.icon} width={20} />{tabTitle(x)}
            </button>
          );
        })}
        {activeTab && (
          <button onClick={() => onHome(activeKey)} aria-pressed={isHome} aria-label={words.homeTab(tabTitle(activeTab))}
            title={words.homeTab(tabTitle(activeTab))} css={css`
              display: grid; place-items: center; padding: 0 12px; border-radius: 13px; border: none; cursor: pointer; background: transparent;
              color: ${isHome ? colours.accent : colours.muted};
              &:hover { background: ${colours.glassHi}; } &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
            `}>
            <Icon icon={isHome ? "mdi:home" : "mdi:home-outline"} width={20} />
          </button>
        )}
      </nav>
      <div css={css`display: flex; align-items: center; gap: 10px; justify-self: end; flex-wrap: wrap;`}>
        {weather && <WeatherChip st={weather} />}
        {people.map((p) => <PersonChip key={p.entity_id} st={p} picture={p.attributes.entity_picture ? joinHassUrl(String(p.attributes.entity_picture)) : undefined} />)}
        {onEdit && (
          <button onClick={onEdit} aria-label={words.editHint} title={words.editHint} css={[glass, css`
            ${buttonFont}; display: flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 14px; cursor: pointer; color: ${colours.text};
            &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }`]}>
            <Icon icon="mdi:pencil-outline" width={18} />{words.edit}
          </button>
        )}
      </div>
    </header>
  );
}

function WeatherChip({ st }: { st: StateLite }) {
  const temp = st.attributes.temperature as number | undefined;
  const unit = (st.attributes.temperature_unit as string | undefined) ?? "°";
  return (
    <span css={[glass, css`display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 14px;`]}>
      <Icon icon={WEATHER_ICONS[st.state] ?? "mdi:weather-cloudy"} width={22} />
      <span css={css`font-weight: 650;`}>{temp != null ? `${Math.round(temp)}${unit}` : t().condition[st.state] ?? st.state}</span>
    </span>
  );
}

function PersonChip({ st, picture }: { st: StateLite; picture?: string }) {
  const raw = String(st.attributes.friendly_name ?? st.entity_id);
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);
  const home = st.state === "home";
  const words = t();
  const where = st.state === "not_home" ? words.away : st.state === "unknown" ? words.unknown : st.state === "home" ? words.state.home
    : st.state.charAt(0).toUpperCase() + st.state.slice(1);
  return (
    <span title={`${name}: ${where}`} css={[glass, css`display: flex; align-items: center; gap: 8px; padding: 5px 12px 5px 5px; border-radius: 22px;`]}>
      {picture
        ? <img src={picture} alt="" css={css`width: 32px; height: 32px; border-radius: 50%; object-fit: cover; outline: 2px solid ${home ? colours.good : colours.edge};`} />
        : <span css={css`width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: ${colours.glassHi}; font-weight: 700;`}>{name.slice(0, 1)}</span>}
      <span css={css`font-size: 13px; line-height: 1.15;`}>
        <span css={css`display: block; font-weight: 650;`}>{name.split(" ")[0]}</span>
        <span css={css`color: ${home ? colours.good : colours.muted};`}>{where}</span>
      </span>
    </span>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** After IDLE_MS without a touch, a key or the mouse, call back (the wall goes back to this screen's home tab). */
function useIdleReturn(enabled: boolean, back: () => void) {
  const ref = useRef(back);
  ref.current = back;
  useEffect(() => {
    if (!enabled) return;
    let timer = setTimeout(() => ref.current(), IDLE_MS);
    const poke = () => { clearTimeout(timer); timer = setTimeout(() => ref.current(), IDLE_MS); };
    const events = ["pointerdown", "keydown", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, poke)); };
  }, [enabled]);
}

/** Keep the tablet's screen on while the wall is showing (Screen Wake Lock; ignored where the browser has none). Only on
 *  the wall's own page: inside Home Assistant's sidebar on a phone or a PC the screen sleeps as it should. */
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } };
    if (!nav.wakeLock) return;
    let lock: Sentinel | null = null;
    const take = () => {
      if (document.visibilityState === "visible") nav.wakeLock!.request("screen").then((l) => { lock = l; }).catch(() => { /* needs a tap first on some browsers */ });
    };
    take();
    document.addEventListener("visibilitychange", take);
    window.addEventListener("pointerdown", take, { once: true });
    return () => { document.removeEventListener("visibilitychange", take); void lock?.release(); };
  }, [enabled]);
}

/** Whether the connection to Home Assistant has been down for over ten seconds. A sign-in that can no longer be renewed
 *  reloads the page (on the wall's own page), which goes to Home Assistant's sign-in only if it really has gone. */
function useConnectionDown(connection: Any): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!connection?.addEventListener) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const lost = () => { clearTimeout(timer); timer = setTimeout(() => setDown(true), 10_000); };
    const back = () => { clearTimeout(timer); setDown(false); };
    const gone = () => { if (!framed) location.reload(); };
    connection.addEventListener("disconnected", lost);
    connection.addEventListener("ready", back);
    connection.addEventListener("reconnect-error", gone);
    return () => {
      clearTimeout(timer);
      connection.removeEventListener("disconnected", lost);
      connection.removeEventListener("ready", back);
      connection.removeEventListener("reconnect-error", gone);
    };
  }, [connection]);
  return down;
}

const newer = (a: string, b: string) => {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0), pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
};

/** After an update (Home Assistant restarted with a newer Wall Panel), load the new page: its address carries the
 *  version, so no cache hands back the old one. Only ever for a newer version, and once per version in ten minutes:
 *  between an update's download and the restart Home Assistant still reports the old version. */
function useVersionCheck(connection: Any) {
  useEffect(() => {
    if (!connection?.sendMessagePromise) return;
    const check = () => {
      connection.sendMessagePromise({ type: "manifest/get", integration: "wall_panel" })
        .then((m: { version?: string } | null) => {
          const version = m?.version;
          if (!version || !newer(version, __WALL_VERSION__)) return;
          try {
            const [last, at] = (sessionStorage.getItem(RELOADED_KEY) ?? "").split("@");
            if (last === version && Date.now() - Number(at) < 600_000) return;
            sessionStorage.setItem(RELOADED_KEY, `${version}@${Date.now()}`);
          } catch { /* private mode: the version guard above still holds */ }
          const url = new URL(location.href);
          url.searchParams.set("v", version);
          location.replace(url.toString());
        })
        .catch(() => { /* not allowed, or the dev server: carry on */ });
    };
    check();
    connection.addEventListener?.("ready", check);
    return () => connection.removeEventListener?.("ready", check);
  }, [connection]);
}
