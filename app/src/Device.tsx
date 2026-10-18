/* One device on the wall: the kit's own cards for the rich ones (heating, media, vacuum, camera, alarm), a lock tile
 * that asks before unlocking, and a big toggle tile for everything that switches. */
import { memo, useState } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { useHass } from "@hakit/core";
import { callService } from "home-assistant-js-websocket";
import { AlarmCard, CameraCard, ClimateCard, SensorCard, VacuumCard } from "@hakit/components";
import { colours, glass, iconFor, tinted, Sheet, RoundButton, notify } from "./ui.tsx";
import { binaryWord, domainOf, TOGGLE_DOMAINS, type Placed, type StateLite } from "./model.ts";
import { t } from "./i18n.ts";

// the kit types entity ids from a generated list; this dashboard is generic, so ids are plain strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Run a service on an entity through the connection and wait for Home Assistant's answer. True when it worked; when it
 *  did not (not connected, the device refused, the cloud said no), a short note says so and false comes back, so the
 *  caller can put back what it showed. */
export async function call(domain: string, service: string, entityId: string, data?: Record<string, unknown>): Promise<boolean> {
  const { connection } = useHass.getState();
  if (!connection) {
    notify(t().notConnected);
    return false;
  }
  try {
    await callService(connection as Any, domain, service, data, { entity_id: entityId });
    return true;
  } catch (err) {
    const e = err as { message?: string; code?: string } | undefined;
    notify(t().failed(e?.message || e?.code || String(err)));
    return false;
  }
}

export const isOn = (st: StateLite | undefined) =>
  !!st && ["on", "open", "opening", "unlocked", "unlocking", "playing", "cleaning", "heat", "cool", "heat_cool", "auto", "home"].includes(st.state);

/** A state in words: a binary sensor by its class (a door is Open or Closed), a reading with its unit, else the state. */
export const stateText = (st: StateLite | undefined) => {
  if (!st) return "";
  const words = t().state;
  if (st.state === "unavailable" || st.state === "unknown") return words[st.state];
  if (domainOf(st.entity_id) === "binary_sensor") return words[binaryWord(st.attributes.device_class, st.state === "on")];
  const unit = st.attributes.unit_of_measurement;
  if (unit) return `${st.state} ${unit}`;
  if (words[st.state]) return words[st.state];
  const s = st.state.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** What a device's tile is given: the tile, every state, its room (shown after the state) and the name to show (the
 *  device's name without the room in front, inside a room's sheet). */
interface TileProps { item: Placed; states: Record<string, StateLite>; room?: string; title?: string; lang?: string }

/** Whether two renders show the same: the same tile, words and states of its entities. */
const sameStates = (a: TileProps, b: TileProps) =>
  a.item === b.item && a.room === b.room && a.title === b.title && a.lang === b.lang
  && a.item.entities.every((id) => a.states[id] === b.states[id]);

/** A device's control, sized to sit in a grid; drawn again only when one of its own entities changes. */
export const DeviceControl = memo(function DeviceControl(props: TileProps) {
  const { item } = props;
  const name = props.title ?? item.name;
  const common = { entity: item.primary as Any, disableColumns: true } as Any;
  switch (item.domain) {
    case "climate": return <ClimateCard {...common} title={name} showTemperatureControls />;
    case "media_player": return <MediaTile {...props} />;
    case "vacuum": return <VacuumCard {...common} title={name} />;
    case "camera": return <CameraCard {...common} name={name} view="poster" />;
    case "alarm_control_panel": return <AlarmCard {...common} title={name} />;
    case "lock": return <LockTile {...props} />;
    case "sensor": return <SensorCard {...common} title={name} />;
    default: return <ToggleTile {...props} />;
  }
}, sameStates);

/** A big square tile: tap toggles (or runs a scene or script); sensors only show their state. */
export function ToggleTile({ item, states, room, title }: TileProps) {
  const name = title ?? item.name;
  const st = states[item.primary];
  const domain = item.domain;
  const on = isOn(st);
  const dc = st?.attributes.device_class;
  const tone = domain === "light" ? colours.warm : domain === "binary_sensor" ? colours.bad : colours.accent;
  const actionable = TOGGLE_DOMAINS.has(domain) || domain === "scene" || domain === "script";
  const icon = (st?.attributes.icon as string | undefined) || iconFor(domain, dc, on);
  const tap = () => {
    if (!actionable || st?.state === "unavailable") return;
    if (domain === "scene" || domain === "script") void call(domain, "turn_on", item.primary);
    else void call(domain, "toggle", item.primary);
  };
  return (
    <button
      onClick={tap}
      aria-pressed={actionable && domain !== "scene" && domain !== "script" ? on : undefined}
      css={[glass, on ? tinted(tone) : null, css`
        width: 100%; min-height: 128px; padding: 14px 16px; text-align: left; color: ${colours.text}; cursor: ${actionable ? "pointer" : "default"};
        display: flex; flex-direction: column; justify-content: space-between; gap: 10px; font: inherit;
        transition: transform 0.12s; &:active { transform: ${actionable ? "scale(0.97)" : "none"}; }
        &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
      `]}
    >
      <Icon icon={icon} width={34} css={css`color: ${on ? tone : colours.muted};`} />
      <div>
        <div css={css`font-weight: 650; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>{name}</div>
        <div css={css`color: ${colours.muted}; font-size: 13px;`}>{stateText(st)}{room ? ` · ${room}` : ""}</div>
      </div>
    </button>
  );
}

/** A lock: tap locks at once, but unlocking asks first, so nobody opens the front door by brushing the screen. Shows
 *  the door's own sensor too when the lock has one. */
export function LockTile({ item, states, room, title }: TileProps) {
  const name = title ?? item.name;
  const [ask, setAsk] = useState(false);
  const st = states[item.primary];
  const unlocked = st?.state === "unlocked" || st?.state === "open";
  const jammed = st?.state === "jammed";
  const doorId = item.entities.find((e) => domainOf(e) === "binary_sensor");
  const door = doorId ? states[doorId] : undefined;
  const tone = jammed ? colours.bad : unlocked ? colours.bad : colours.good;
  const tap = () => {
    if (!st || st.state === "unavailable") return;
    if (unlocked) void call("lock", "lock", item.primary);
    else setAsk(true);
  };
  return (
    <>
      <button onClick={tap} css={[glass, tinted(tone), css`
        width: 100%; min-height: 128px; padding: 14px 16px; text-align: left; color: ${colours.text}; cursor: pointer; font: inherit;
        display: flex; flex-direction: column; justify-content: space-between; gap: 10px;
        &:active { transform: scale(0.97); } &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
      `]}>
        <Icon icon={unlocked ? "mdi:lock-open-variant" : jammed ? "mdi:lock-alert" : "mdi:lock"} width={36} css={css`color: ${tone};`} />
        <div>
          <div css={css`font-weight: 650; font-size: 15px;`}>{name}</div>
          <div css={css`color: ${colours.muted}; font-size: 13px;`}>
            {stateText(st)}{door ? ` · ${stateText(door)}` : ""}{room ? ` · ${room}` : ""}
          </div>
        </div>
      </button>
      <Sheet open={ask} title={t().unlockAsk(name)} onClose={() => setAsk(false)} width={460}>
        <div css={css`display: flex; gap: 12px; justify-content: flex-end; padding: 8px 0;`}>
          <button data-autofocus css={buttonCss(false)} onClick={() => setAsk(false)}>{t().cancel}</button>
          <button css={buttonCss(true)} onClick={() => { setAsk(false); void call("lock", "unlock", item.primary); }}>{t().unlock}</button>
        </div>
      </Sheet>
    </>
  );
}

export const buttonCss = (primary: boolean) => css`
  font: inherit; font-weight: 600; padding: 10px 18px; border-radius: 12px; cursor: pointer;
  border: 1px solid ${primary ? "transparent" : colours.edge};
  background: ${primary ? colours.accent : colours.glassHi}; color: ${primary ? "#0d1022" : colours.text};
  &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
`;

/** A TV or speaker: what is on, power, play or pause, and volume. */
export function MediaTile({ item, states, room, title }: TileProps) {
  const name = title ?? item.name;
  const st = states[item.primary];
  const state = st?.state ?? "unavailable";
  const on = !["off", "standby", "unavailable", "unknown"].includes(state);
  const a = st?.attributes ?? {};
  const what = [a.media_title, a.app_name].filter(Boolean).join(" · ");
  const id = item.primary;
  const words = t();
  return (
    <div css={[glass, on ? tinted(colours.accent) : null, css`min-height: 128px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;`]}>
      <div css={css`display: flex; align-items: center; gap: 12px;`}>
        <Icon icon={iconFor("media_player", undefined, state === "playing")} width={32} css={css`color: ${on ? colours.accent : colours.muted};`} />
        <div css={css`flex: 1; min-width: 0;`}>
          <div css={css`font-weight: 650; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>{name}</div>
          <div css={css`color: ${colours.muted}; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>
            {stateText(st)}{what ? ` · ${what}` : ""}{room ? ` · ${room}` : ""}
          </div>
        </div>
        {state !== "unavailable" && <RoundButton icon="mdi:power" title={words.power(name)} on={on} tone={colours.accent} onClick={() => void call("media_player", "toggle", id)} />}
      </div>
      {on && (
        <div css={css`display: flex; gap: 10px;`}>
          <RoundButton icon={state === "playing" ? "mdi:pause" : "mdi:play"} title={words.playPause} onClick={() => void call("media_player", "media_play_pause", id)} />
          <RoundButton icon="mdi:volume-minus" title={words.volumeDown} onClick={() => void call("media_player", "volume_down", id)} />
          <RoundButton icon="mdi:volume-plus" title={words.volumeUp} onClick={() => void call("media_player", "volume_up", id)} />
        </div>
      )}
    </div>
  );
}
