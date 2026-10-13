/* The page: a header with the tabs across the top, the clock, the weather and who is home; under it the chosen tab.
 * Made for a wall tablet: it keeps the screen awake while showing, and goes back to the first tab after two minutes
 * without a touch. */
import { useEffect, useRef, useState } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { useHass } from "@hakit/core";
import { useWall } from "./useWall.ts";
import { FloorTab } from "./FloorTab.tsx";
import { TasksTab } from "./TasksTab.tsx";
import { SecurityTab } from "./SecurityTab.tsx";
import { EditPanel } from "./EditPanel.tsx";
import { colours, glass, WEATHER_ICONS, buttonFont } from "./ui.tsx";
import { SECURITY, TASKS, type StateLite } from "./model.ts";

const IDLE_MS = 2 * 60 * 1000;
const TAB_KEY = "wall-panel-tab";

export function Wall() {
  const wall = useWall();
  const [tab, setTab] = useState<string>(() => {
    try { return sessionStorage.getItem(TAB_KEY) ?? ""; } catch { return ""; }
  });
  const [editing, setEditing] = useState(false);
  const active = wall.tabs.find((t) => t.key === tab) ?? wall.tabs[0];
  const choose = (key: string) => {
    setTab(key);
    try { sessionStorage.setItem(TAB_KEY, key); } catch { /* private mode */ }
  };
  useIdleReturn(() => { if (wall.tabs[0] && !editing) choose(wall.tabs[0].key); });
  useWakeLock();
  if (!active) return null;
  return (
    <div css={css`max-width: 1680px; margin: 0 auto; padding: 18px 22px 40px;`}>
      <Header wall={wall} activeKey={active.key} onTab={choose} onEdit={wall.isAdmin ? () => setEditing(true) : undefined} />
      <main css={css`margin-top: 18px;`}>
        {active.kind === "floor" && <FloorTab tabKey={active.key} wall={wall} />}
        {active.key === TASKS && <TasksTab wall={wall} />}
        {active.key === SECURITY && <SecurityTab wall={wall} />}
      </main>
      {wall.isAdmin && <EditPanel wall={wall} open={editing} onClose={() => setEditing(false)} />}
    </div>
  );
}

function Header({ wall, activeKey, onTab, onEdit }: {
  wall: ReturnType<typeof useWall>; activeKey: string; onTab: (k: string) => void; onEdit?: () => void;
}) {
  const config = useHass((s) => s.config);
  const joinHassUrl = useHass((s) => s.helpers.joinHassUrl);
  const now = useNow();
  const weatherId = Object.keys(wall.states).find((id) => id.startsWith("weather."));
  const weather = weatherId ? wall.states[weatherId] : undefined;
  const people = Object.values(wall.states).filter((s) => s.entity_id.startsWith("person."));
  const lang = (config as { language?: string } | null)?.language || navigator.language;
  const time = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const date = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(now);
  return (
    <header css={css`display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 18px; align-items: center;
      @media (max-width: 900px) { grid-template-columns: 1fr; }`}>
      <div>
        <div css={css`font-size: 40px; font-weight: 750; line-height: 1; letter-spacing: -0.02em;`}>{time}</div>
        <div css={css`color: ${colours.muted}; margin-top: 4px;`}>{date}{config?.location_name ? ` · ${config.location_name}` : ""}</div>
      </div>
      <nav aria-label="Wall tabs" css={[glass, css`display: flex; gap: 6px; padding: 6px; border-radius: 18px; overflow-x: auto; justify-self: center; max-width: 100%;`]}>
        {wall.tabs.map((t) => {
          const on = t.key === activeKey;
          return (
            <button key={t.key} onClick={() => onTab(t.key)} aria-current={on ? "page" : undefined} css={css`
              display: flex; align-items: center; gap: 8px; white-space: nowrap; ${buttonFont}; font-weight: 600; padding: 11px 18px;
              border-radius: 13px; border: none; cursor: pointer; color: ${on ? "#0d1022" : colours.text};
              background: ${on ? colours.accent : "transparent"}; transition: background 0.2s;
              &:hover { background: ${on ? colours.accent : colours.glassHi}; }
              &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
            `}>
              <Icon icon={t.icon} width={20} />{t.title}
            </button>
          );
        })}
      </nav>
      <div css={css`display: flex; align-items: center; gap: 10px; justify-self: end; flex-wrap: wrap;`}>
        {weather && <WeatherChip st={weather} />}
        {people.map((p) => <PersonChip key={p.entity_id} st={p} picture={p.attributes.entity_picture ? joinHassUrl(String(p.attributes.entity_picture)) : undefined} />)}
        {onEdit && (
          <button onClick={onEdit} aria-label="Edit where devices live" title="Edit where devices live" css={[glass, css`
            ${buttonFont}; display: flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 14px; cursor: pointer; color: ${colours.text};`]}>
            <Icon icon="mdi:pencil-outline" width={18} />Edit
          </button>
        )}
      </div>
    </header>
  );
}

function WeatherChip({ st }: { st: StateLite }) {
  const t = st.attributes.temperature as number | undefined;
  const unit = (st.attributes.temperature_unit as string | undefined) ?? "°";
  return (
    <span css={[glass, css`display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 14px;`]}>
      <Icon icon={WEATHER_ICONS[st.state] ?? "mdi:weather-cloudy"} width={22} />
      <span css={css`font-weight: 650;`}>{t != null ? `${Math.round(t)}${unit}` : st.state}</span>
    </span>
  );
}

function PersonChip({ st, picture }: { st: StateLite; picture?: string }) {
  const raw = String(st.attributes.friendly_name ?? st.entity_id);
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);
  const home = st.state === "home";
  const where = st.state === "not_home" ? "Away" : st.state === "unknown" ? "Unknown" : st.state.charAt(0).toUpperCase() + st.state.slice(1);
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
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** After IDLE_MS without a touch, a key or the mouse, call back (the page goes back to its first tab). */
function useIdleReturn(back: () => void) {
  const ref = useRef(back);
  ref.current = back;
  useEffect(() => {
    let timer = setTimeout(() => ref.current(), IDLE_MS);
    const poke = () => { clearTimeout(timer); timer = setTimeout(() => ref.current(), IDLE_MS); };
    const events = ["pointerdown", "keydown", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, poke)); };
  }, []);
}

/** Keep the tablet's screen on while the wall is showing (Screen Wake Lock; ignored where the browser has none). */
function useWakeLock() {
  useEffect(() => {
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
  }, []);
}
