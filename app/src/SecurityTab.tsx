/* Security: this house's locks, doors and windows, alarm, cameras and sensors, with one line at the top saying whether
 * everything is locked and shut, and the house's low batteries. Only devices with a room in this house appear (rule 2
 * in model.ts), so the other house's locks on a shared account stay off. */
import { useMemo } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { DeviceControl } from "./Device.tsx";
import { Batteries } from "./Batteries.tsx";
import { colours, glass, gridOf, sectionTitle, tinted, Empty } from "./ui.tsx";
import { domainOf, SECURITY, type Placed } from "./model.ts";
import type { Wall } from "./useWall.ts";

const GROUPS: [string, string, (p: Placed) => boolean][] = [
  ["Locks", "mdi:lock", (p) => p.domain === "lock"],
  ["Alarm", "mdi:shield-home", (p) => p.domain === "alarm_control_panel"],
  ["Doors and windows", "mdi:door", (p) => p.domain === "binary_sensor"],
  ["Cameras", "mdi:cctv", (p) => p.domain === "camera"],
];

export function SecurityTab({ wall }: { wall: Wall }) {
  const items = wall.placed.filter((p) => p.tab === SECURITY);
  const houseAreas = useMemo(() => new Set(Object.keys(wall.areas)), [wall.areas]);
  const room = (p: Placed) => (p.areaId ? wall.areas[p.areaId]?.name : undefined);
  // what is not secure right now: unlocked locks, open doors and windows (a lock's own door sensor counts)
  const issues: string[] = [];
  for (const p of items) {
    for (const id of p.entities) {
      const st = wall.states[id];
      if (!st) continue;
      if (domainOf(id) === "lock" && (st.state === "unlocked" || st.state === "open" || st.state === "jammed")) issues.push(`${p.name} ${st.state}`);
      if (domainOf(id) === "binary_sensor" && st.state === "on" && ["door", "window", "garage_door", "opening"].includes(String(st.attributes.device_class))) {
        issues.push(`${p.name} open`);
      }
    }
  }
  if (!items.length) {
    return <Empty>No locks, doors or cameras with a room in this house yet. Anything can be moved here with the "Wall: Security" label.</Empty>;
  }
  const rest = items.filter((p) => !GROUPS.some(([, , f]) => f(p)));
  return (
    <div css={css`display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 360px; @media (max-width: 1000px) { grid-template-columns: 1fr; }`}>
      <div>
        <div css={[glass, tinted(issues.length ? colours.bad : colours.good), css`padding: 18px 20px; display: flex; align-items: center; gap: 14px;`]}>
          <Icon icon={issues.length ? "mdi:shield-alert" : "mdi:shield-check"} width={40} css={css`color: ${issues.length ? colours.bad : colours.good};`} />
          <div>
            <div css={css`font-size: 18px; font-weight: 700;`}>{issues.length ? `${issues.length} to check` : "All locked and shut"}</div>
            {issues.length > 0 && <div css={css`color: ${colours.muted};`}>{issues.join(" · ")}</div>}
          </div>
        </div>
        {GROUPS.map(([title, icon, match]) => {
          const group = items.filter(match);
          if (!group.length) return null;
          return (
            <div key={title}>
              <div css={sectionTitle}><Icon icon={icon} width={18} />{title}</div>
              <div css={gridOf(title === "Cameras" ? 320 : 220)}>
                {group.map((p) => <DeviceControl key={p.key} item={p} states={wall.states} room={room(p)} />)}
              </div>
            </div>
          );
        })}
        {rest.length > 0 && (
          <div>
            <div css={sectionTitle}><Icon icon="mdi:tag-outline" width={18} />Also here</div>
            <div css={gridOf(220)}>{rest.map((p) => <DeviceControl key={p.key} item={p} states={wall.states} room={room(p)} />)}</div>
          </div>
        )}
      </div>
      <aside css={css`display: flex; flex-direction: column; gap: 14px;`}>
        <Batteries areaIds={houseAreas} entities={wall.entities} devices={wall.devices} />
      </aside>
    </div>
  );
}
