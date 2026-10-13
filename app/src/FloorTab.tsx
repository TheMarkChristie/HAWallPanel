/* A floor: a tile per room (its temperature and humidity, its room icon, round buttons for its lights and switches),
 * which opens to every device in the room; beside them the weather, the floor's heating and its low batteries. */
import { useMemo, useState } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { ClimateCard } from "@hakit/components";
import { useHass } from "@hakit/core";
import { WeatherPanel } from "./Weather.tsx";
import { call, DeviceControl, isOn } from "./Device.tsx";
import { Batteries } from "./Batteries.tsx";
import { colours, glass, gridOf, iconFor, RoundButton, tinted, Empty, Sheet } from "./ui.tsx";
import { roomIcon, roomsOf, shortName, TOGGLE_DOMAINS, type Room } from "./model.ts";
import type { Wall } from "./useWall.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function FloorTab({ tabKey, wall }: { tabKey: string; wall: Wall }) {
  const rooms = useMemo(() => roomsOf(tabKey, wall.placed, wall), [tabKey, wall]);
  const [open, setOpen] = useState<string | null>(null);
  const weather = Object.keys(wall.states).find((id) => id.startsWith("weather."));
  const heating = rooms.flatMap((r) => r.items.filter((i) => i.domain === "climate"));
  const floorAreas = useMemo(() => new Set(Object.values(wall.areas).filter((a) => a.floor_id === tabKey).map((a) => a.area_id)), [wall.areas, tabKey]);
  const openRoom = rooms.find((r) => r.area.area_id === open);
  const config = useHass((s) => s.config) as { language?: string } | null;
  return (
    <div css={css`display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 360px;
      @media (max-width: 1000px) { grid-template-columns: 1fr; }`}>
      <div>
        {rooms.length ? (
          <div css={gridOf(250)}>
            {rooms.map((r) => <RoomTile key={r.area.area_id} room={r} wall={wall} onOpen={() => setOpen(r.area.area_id)} />)}
          </div>
        ) : (
          <Empty>Nothing on this floor yet. Give devices a room on this floor in Home Assistant, or move one here in Edit.</Empty>
        )}
      </div>
      <aside css={css`display: flex; flex-direction: column; gap: 14px;`}>
        {weather && <WeatherPanel entityId={weather} locale={config?.language || navigator.language} />}
        {heating.map((h) => (
          <ClimateCard key={h.key} entity={h.primary as Any} title={h.name} disableColumns showTemperatureControls {...({} as Any)} />
        ))}
        <Batteries areaIds={floorAreas} entities={wall.entities} devices={wall.devices} />
      </aside>
      <Sheet open={!!openRoom} title={openRoom?.area.name} onClose={() => setOpen(null)}>
        {openRoom && (
          <div css={gridOf(260)}>
            {openRoom.items.map((i) => (
              <DeviceControl key={i.key} item={{ ...i, name: shortName(i.name, openRoom.area.name) }} states={wall.states} />
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function RoomTile({ room, wall, onOpen }: { room: Room; wall: Wall; onOpen: () => void }) {
  const toggles = room.items.filter((i) => TOGGLE_DOMAINS.has(i.domain));
  const lightsOn = room.items.filter((i) => i.domain === "light" && isOn(wall.states[i.primary])).length;
  const anyOn = room.items.some((i) => TOGGLE_DOMAINS.has(i.domain) && isOn(wall.states[i.primary]));
  // round buttons: the room's switches first (a tap toggles), then its other devices as status (a tap opens the room)
  const status = room.items.filter((i) => !TOGGLE_DOMAINS.has(i.domain));
  const up = (i: { primary: string }) => wall.states[i.primary]?.state !== "unavailable";
  const shown = [...toggles.filter(up), ...status.filter(up)].slice(0, 3);
  const others = room.items.length - shown.length;
  const playing = room.items.filter((i) => i.domain === "media_player" && ["playing", "on", "paused"].includes(wall.states[i.primary]?.state ?? ""));
  const busy = room.items.filter((i) => (i.domain === "vacuum" || i.domain === "lawn_mower") && ["cleaning", "mowing", "returning"].includes(wall.states[i.primary]?.state ?? ""));
  const summary = [
    lightsOn ? `${lightsOn} ${lightsOn === 1 ? "light" : "lights"} on` : "",
    ...playing.map((i) => `${shortName(i.name, room.area.name)} ${wall.states[i.primary]?.state}`),
    ...busy.map((i) => `${shortName(i.name, room.area.name)} ${wall.states[i.primary]?.state}`),
  ].filter(Boolean);
  const readings = [room.temperature, room.humidity].filter(Boolean).join(" / ");
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      aria-label={`${room.area.name}, ${room.items.length} devices`}
      css={[glass, anyOn ? tinted(colours.warm) : null, css`
        position: relative; min-height: 172px; padding: 16px 18px; cursor: pointer; display: flex; flex-direction: column;
        transition: transform 0.12s; &:active { transform: scale(0.985); }
        &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
      `]}
    >
      <div css={css`display: flex; gap: 10px;`}>
        <div css={css`flex: 1; min-width: 0;`}>
          <div css={css`font-weight: 700; font-size: 17px;`}>{room.area.name}</div>
          {readings && <div css={css`color: ${colours.muted}; font-size: 13px; margin-top: 2px;`}>{readings}</div>}
          {summary.length > 0 && <div css={css`color: ${colours.warm}; font-size: 13px; margin-top: 2px;`}>{summary.join(" · ")}</div>}
          {!summary.length && <div css={css`color: ${colours.faint}; font-size: 13px; margin-top: 2px;`}>{room.items.length} {room.items.length === 1 ? "device" : "devices"}, all off</div>}
        </div>
        <div css={css`display: flex; flex-direction: column; gap: 8px;`}>
          {shown.map((i) => {
            const st = wall.states[i.primary];
            const on = isOn(st);
            return (
              <RoundButton key={i.key} title={`${shortName(i.name, room.area.name)}: ${on ? "on" : "off"}`} on={on}
                tone={i.domain === "light" ? colours.warm : colours.accent}
                icon={(st?.attributes.icon as string | undefined) || iconFor(i.domain, st?.attributes.device_class, on)}
                onClick={() => (TOGGLE_DOMAINS.has(i.domain) ? call(i.domain, "toggle", i.primary) : onOpen())} />
            );
          })}
          {others > 0 && <RoundButton icon="mdi:dots-horizontal" title={`${others} more in ${room.area.name}`} badge={others} onClick={onOpen} />}
        </div>
      </div>
      <Icon icon={roomIcon(room.area)} width={46} css={css`margin-top: auto; color: ${anyOn ? colours.warm : colours.faint};`} />
    </div>
  );
}
