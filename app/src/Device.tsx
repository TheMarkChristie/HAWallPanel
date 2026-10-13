/* One device on the wall: the kit's own cards for the rich ones (heating, media, vacuum, camera, alarm), a lock tile
 * that asks before unlocking, and a big toggle tile for everything that switches. */
import { useState } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { useHass } from "@hakit/core";
import { AlarmCard, CameraCard, ClimateCard, SensorCard, VacuumCard } from "@hakit/components";
import { colours, glass, iconFor, tinted, Sheet, RoundButton } from "./ui.tsx";
import { domainOf, TOGGLE_DOMAINS, type Placed, type StateLite } from "./model.ts";

// the kit types entity ids from a generated list; this dashboard is generic, so ids are plain strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function call(domain: string, service: string, entityId: string, data?: Record<string, unknown>) {
  const { callService } = useHass.getState().helpers;
  (callService as Any)({ domain, service, target: { entity_id: entityId }, serviceData: data });
}

export const isOn = (st: StateLite | undefined) =>
  !!st && ["on", "open", "opening", "unlocked", "unlocking", "playing", "cleaning", "heat", "cool", "heat_cool", "auto", "home"].includes(st.state);

const label = (st: StateLite | undefined) => {
  if (!st) return "";
  if (st.state === "unavailable") return "Unavailable";
  const unit = st.attributes.unit_of_measurement;
  const s = st.state.replace(/_/g, " ");
  return unit ? `${st.state} ${unit}` : s.charAt(0).toUpperCase() + s.slice(1);
};

/** A device's control, sized to sit in a grid. */
export function DeviceControl({ item, states, room }: { item: Placed; states: Record<string, StateLite>; room?: string }) {
  const id = item.primary;
  const domain = item.domain;
  const common = { entity: id as Any, disableColumns: true } as Any;
  switch (domain) {
    case "climate": return <ClimateCard {...common} title={item.name} showTemperatureControls />;
    case "media_player": return <MediaTile item={item} states={states} room={room} />;
    case "vacuum": return <VacuumCard {...common} title={item.name} />;
    case "camera": return <CameraCard {...common} name={item.name} view="poster" />;
    case "alarm_control_panel": return <AlarmCard {...common} title={item.name} />;
    case "lock": return <LockTile item={item} states={states} room={room} />;
    case "sensor": return <SensorCard {...common} title={item.name} />;
    default: return <ToggleTile item={item} states={states} room={room} />;
  }
}

/** A big square tile: tap toggles (or runs a scene or script); sensors only show their state. */
export function ToggleTile({ item, states, room }: { item: Placed; states: Record<string, StateLite>; room?: string }) {
  const st = states[item.primary];
  const domain = item.domain;
  const on = isOn(st);
  const dc = st?.attributes.device_class;
  const tone = domain === "light" ? colours.warm : domain === "binary_sensor" ? colours.bad : colours.accent;
  const actionable = TOGGLE_DOMAINS.has(domain) || domain === "scene" || domain === "script";
  const icon = (st?.attributes.icon as string | undefined) || iconFor(domain, dc, on);
  const tap = () => {
    if (!actionable || st?.state === "unavailable") return;
    if (domain === "scene" || domain === "script") call(domain, "turn_on", item.primary);
    else call(domain, "toggle", item.primary);
  };
  return (
    <button
      onClick={tap}
      aria-pressed={actionable ? on : undefined}
      css={[glass, on ? tinted(tone) : null, css`
        width: 100%; min-height: 128px; padding: 14px 16px; text-align: left; color: ${colours.text}; cursor: ${actionable ? "pointer" : "default"};
        display: flex; flex-direction: column; justify-content: space-between; gap: 10px; font: inherit;
        transition: transform 0.12s; &:active { transform: ${actionable ? "scale(0.97)" : "none"}; }
        &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
      `]}
    >
      <Icon icon={icon} width={34} css={css`color: ${on ? tone : colours.muted};`} />
      <div>
        <div css={css`font-weight: 650; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>{item.name}</div>
        <div css={css`color: ${colours.muted}; font-size: 13px;`}>{label(st)}{room ? ` · ${room}` : ""}</div>
      </div>
    </button>
  );
}

/** A lock: tap locks at once, but unlocking asks first, so nobody opens the front door by brushing the screen. Shows
 *  the door's own sensor too when the lock has one. */
export function LockTile({ item, states, room }: { item: Placed; states: Record<string, StateLite>; room?: string }) {
  const [ask, setAsk] = useState(false);
  const st = states[item.primary];
  const unlocked = st?.state === "unlocked" || st?.state === "open";
  const jammed = st?.state === "jammed";
  const doorId = item.entities.find((e) => domainOf(e) === "binary_sensor");
  const door = doorId ? states[doorId] : undefined;
  const tone = jammed ? colours.bad : unlocked ? colours.bad : colours.good;
  const tap = () => {
    if (!st || st.state === "unavailable") return;
    if (unlocked) call("lock", "lock", item.primary);
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
          <div css={css`font-weight: 650; font-size: 15px;`}>{item.name}</div>
          <div css={css`color: ${colours.muted}; font-size: 13px;`}>
            {label(st)}{door ? ` · ${door.state === "on" ? "Open" : "Closed"}` : ""}{room ? ` · ${room}` : ""}
          </div>
        </div>
      </button>
      <Sheet open={ask} title={`Unlock ${item.name}?`} onClose={() => setAsk(false)} width={460}>
        <div css={css`display: flex; gap: 12px; justify-content: flex-end; padding: 8px 0;`}>
          <button css={buttonCss(false)} onClick={() => setAsk(false)}>Cancel</button>
          <button css={buttonCss(true)} onClick={() => { call("lock", "unlock", item.primary); setAsk(false); }}>Unlock</button>
        </div>
      </Sheet>
    </>
  );
}

export const buttonCss = (primary: boolean) => css`
  font: inherit; font-weight: 600; padding: 10px 18px; border-radius: 12px; cursor: pointer;
  border: 1px solid ${primary ? "transparent" : colours.edge};
  background: ${primary ? colours.accent : colours.glassHi}; color: ${primary ? "#0d1022" : colours.text};
`;

/** A TV or speaker: what is on, power, play or pause, and volume. */
export function MediaTile({ item, states, room }: { item: Placed; states: Record<string, StateLite>; room?: string }) {
  const st = states[item.primary];
  const state = st?.state ?? "unavailable";
  const on = !["off", "standby", "unavailable", "unknown"].includes(state);
  const a = st?.attributes ?? {};
  const what = [a.media_title, a.app_name].filter(Boolean).join(" · ");
  const id = item.primary;
  return (
    <div css={[glass, on ? tinted(colours.accent) : null, css`min-height: 128px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;`]}>
      <div css={css`display: flex; align-items: center; gap: 12px;`}>
        <Icon icon={iconFor("media_player", undefined, state === "playing")} width={32} css={css`color: ${on ? colours.accent : colours.muted};`} />
        <div css={css`flex: 1; min-width: 0;`}>
          <div css={css`font-weight: 650; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>{item.name}</div>
          <div css={css`color: ${colours.muted}; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>
            {label(st)}{what ? ` · ${what}` : ""}{room ? ` · ${room}` : ""}
          </div>
        </div>
        {state !== "unavailable" && <RoundButton icon="mdi:power" title={`${item.name}: power`} on={on} tone={colours.accent} onClick={() => call("media_player", "toggle", id)} />}
      </div>
      {on && (
        <div css={css`display: flex; gap: 10px;`}>
          <RoundButton icon={state === "playing" ? "mdi:pause" : "mdi:play"} title="Play or pause" onClick={() => call("media_player", "media_play_pause", id)} />
          <RoundButton icon="mdi:volume-minus" title="Volume down" onClick={() => call("media_player", "volume_down", id)} />
          <RoundButton icon="mdi:volume-plus" title="Volume up" onClick={() => call("media_player", "volume_up", id)} />
        </div>
      )}
    </div>
  );
}
