/* A floor: a tile per room (its temperature and humidity, its room icon, round buttons for its lights and switches),
 * which opens to every device in the room; beside them the weather, the floor's heating and its low batteries; under
 * them anything a "Wall: <floor>" label put on this floor that has no room. */
import { memo, useCallback, useMemo, useState } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { ClimateCard } from "@hakit/components";
import { WeatherPanel } from "./Weather.tsx";
import { call, DeviceControl, isOn } from "./Device.tsx";
import { Batteries } from "./Batteries.tsx";
import { colours, glass, gridOf, iconFor, RoundButton, sectionTitle, tinted, Empty, Sheet } from "./ui.tsx";
import { readingsByArea, roomIcon, roomless, roomsOf, shortName, TOGGLE_DOMAINS, type Room, type StateLite } from "./model.ts";
import { language, t } from "./i18n.ts";
import type { Wall } from "./useWall.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function FloorTab({ tabKey, wall }: { tabKey: string; wall: Wall }) {
  // every room's readings in one pass over the house, then the rooms of this floor
  const byArea = useMemo(() => readingsByArea(wall), [wall.entities, wall.states, wall.devices]);
  const rooms = useMemo(() => roomsOf(tabKey, wall.placed, wall, byArea), [tabKey, wall.placed, wall.areas, byArea]);
  const extra = useMemo(() => roomless(tabKey, wall.placed), [tabKey, wall.placed]);
  const [open, setOpen] = useState<string | null>(null);
  const onOpen = useCallback((areaId: string) => setOpen(areaId), []);
  const heating = rooms.flatMap((r) => r.items.filter((i) => i.domain === "climate"));
  const floorAreas = useMemo(() => new Set(Object.values(wall.areas).filter((a) => a.floor_id === tabKey).map((a) => a.area_id)), [wall.areas, tabKey]);
  const openRoom = rooms.find((r) => r.area.area_id === open);
  const lang = language();
  return (
    <div css={css`display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 360px;
      @media (max-width: 1000px) { grid-template-columns: 1fr; }`}>
      <div>
        {rooms.length ? (
          <div css={gridOf(250)}>
            {rooms.map((r) => <RoomTile key={r.area.area_id} room={r} states={wall.states} onOpen={onOpen} lang={lang} />)}
          </div>
        ) : !extra.length ? (
          <Empty>{t().nothingOnFloor}</Empty>
        ) : null}
        {extra.length > 0 && (
          <>
            <div css={sectionTitle}><Icon icon="mdi:tag-outline" width={18} />{t().alsoHere}</div>
            <div css={gridOf(220)}>{extra.map((p) => <DeviceControl key={p.key} item={p} states={wall.states} lang={lang} />)}</div>
          </>
        )}
      </div>
      <aside css={css`display: flex; flex-direction: column; gap: 14px;`}>
        {wall.weather && <WeatherPanel entityId={wall.weather} locale={lang} />}
        {heating.map((h) => (
          <ClimateCard key={h.key} entity={h.primary as Any} title={h.name} disableColumns showTemperatureControls {...({} as Any)} />
        ))}
        <Batteries areaIds={floorAreas} entities={wall.entities} devices={wall.devices} />
      </aside>
      <Sheet open={!!openRoom} title={openRoom?.area.name} onClose={() => setOpen(null)}>
        {openRoom && (
          <div css={gridOf(260)}>
            {openRoom.items.map((i) => (
              <DeviceControl key={i.key} item={i} title={shortName(i.name, openRoom.area.name)} states={wall.states} lang={lang} />
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

interface TileProps { room: Room; states: Record<string, StateLite>; onOpen: (areaId: string) => void; lang: string }

/** Drawn again only when the room's readings, its devices or one of their states change. */
const sameRoom = (a: TileProps, b: TileProps) =>
  a.room.area === b.room.area && a.room.temperature === b.room.temperature && a.room.humidity === b.room.humidity
  && a.lang === b.lang && a.onOpen === b.onOpen && a.room.items.length === b.room.items.length
  && a.room.items.every((item, i) => item === b.room.items[i] && item.entities.every((id) => a.states[id] === b.states[id]));

/** A room: the room's name is the button that opens it (stretched over the tile), and beside it round buttons for its
 *  lights and switches, each a control of its own. */
const RoomTile = memo(function RoomTile({ room, states, onOpen }: TileProps) {
  const words = t();
  const toggles = room.items.filter((i) => TOGGLE_DOMAINS.has(i.domain));
  const lightsOn = room.items.filter((i) => i.domain === "light" && isOn(states[i.primary])).length;
  const anyOn = room.items.some((i) => TOGGLE_DOMAINS.has(i.domain) && isOn(states[i.primary]));
  // round buttons: the room's switches first (a tap toggles), then its other devices as status (a tap opens the room)
  const status = room.items.filter((i) => !TOGGLE_DOMAINS.has(i.domain));
  const up = (i: { primary: string }) => states[i.primary]?.state !== "unavailable";
  const shown = [...toggles.filter(up), ...status.filter(up)].slice(0, 3);
  const others = room.items.length - shown.length;
  const playing = room.items.filter((i) => i.domain === "media_player" && ["playing", "on", "paused"].includes(states[i.primary]?.state ?? ""));
  const busy = room.items.filter((i) => (i.domain === "vacuum" || i.domain === "lawn_mower") && ["cleaning", "mowing", "returning"].includes(states[i.primary]?.state ?? ""));
  const stateWord = (s: string | undefined) => (s ? words.state[s] ?? s : "");
  const summary = [
    lightsOn ? words.lightsOn(lightsOn) : "",
    ...playing.map((i) => `${shortName(i.name, room.area.name)} ${stateWord(states[i.primary]?.state).toLowerCase()}`),
    ...busy.map((i) => `${shortName(i.name, room.area.name)} ${stateWord(states[i.primary]?.state).toLowerCase()}`),
  ].filter(Boolean);
  const readings = [room.temperature, room.humidity].filter(Boolean).join(" / ");
  const open = () => onOpen(room.area.area_id);
  return (
    <div css={[glass, anyOn ? tinted(colours.warm) : null, css`
      position: relative; min-height: 172px; padding: 16px 18px; display: flex; flex-direction: column;
      transition: transform 0.12s; &:has(> button.open:active) { transform: scale(0.985); }
    `]}>
      <button className="open" onClick={open} aria-label={words.roomLabel(room.area.name, room.items.length)} css={css`
        position: absolute; inset: 0; border: 0; border-radius: inherit; background: transparent; cursor: pointer; padding: 0;
        &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
      `} />
      <div css={css`display: flex; gap: 10px; position: relative; pointer-events: none;`}>
        <div css={css`flex: 1; min-width: 0;`}>
          <div css={css`font-weight: 700; font-size: 17px;`}>{room.area.name}</div>
          {readings && <div css={css`color: ${colours.muted}; font-size: 13px; margin-top: 2px;`}>{readings}</div>}
          {summary.length > 0 && <div css={css`color: ${colours.warm}; font-size: 13px; margin-top: 2px;`}>{summary.join(" · ")}</div>}
          {!summary.length && <div css={css`color: ${colours.muted}; font-size: 13px; margin-top: 2px;`}>{words.allOff(room.items.length)}</div>}
        </div>
        <div css={css`display: flex; flex-direction: column; gap: 8px; pointer-events: auto;`}>
          {shown.map((i) => {
            const st = states[i.primary];
            const on = isOn(st);
            return (
              <RoundButton key={i.key} title={words.onOff(shortName(i.name, room.area.name), on)} on={on}
                tone={i.domain === "light" ? colours.warm : colours.accent}
                icon={(st?.attributes.icon as string | undefined) || iconFor(i.domain, st?.attributes.device_class, on)}
                onClick={() => (TOGGLE_DOMAINS.has(i.domain) ? void call(i.domain, "toggle", i.primary) : open())} />
            );
          })}
          {others > 0 && <RoundButton icon="mdi:dots-horizontal" title={words.moreIn(others, room.area.name)} badge={others} onClick={open} />}
        </div>
      </div>
      <Icon icon={roomIcon(room.area)} width={46} aria-hidden="true" css={css`margin-top: auto; position: relative; pointer-events: none;
        color: ${anyOn ? colours.warm : colours.faint};`} />
    </div>
  );
}, sameRoom);
