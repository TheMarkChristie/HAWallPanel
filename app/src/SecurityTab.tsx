/* Security: this house's locks, doors and windows, alarm, smoke, gas and leak sensors, motion, and cameras, with one line
 * at the top saying whether everything is locked, shut and safe, and the house's low batteries. Only devices with a room
 * in this house appear (rule 2 in model.ts), so the other house's locks on a shared account stay off. */
import { useMemo } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { DeviceControl } from "./Device.tsx";
import { Batteries } from "./Batteries.tsx";
import { colours, glass, gridOf, sectionTitle, tinted, Empty } from "./ui.tsx";
import { ALARM_SENSORS, OPENINGS, PRESENCE, SECURITY, securityIssues, type Placed, type StateLite } from "./model.ts";
import { language, t } from "./i18n.ts";
import type { Wall } from "./useWall.ts";

type Group = [keyof ReturnType<typeof t>, string, (p: Placed, states: Record<string, StateLite>) => boolean];
const classOf = (p: Placed, states: Record<string, StateLite>) => String(states[p.primary]?.attributes.device_class ?? "");

const GROUPS: Group[] = [
  ["locks", "mdi:lock", (p) => p.domain === "lock"],
  ["alarm", "mdi:shield-home", (p) => p.domain === "alarm_control_panel"],
  ["alarms", "mdi:smoke-detector", (p, s) => p.domain === "binary_sensor" && ALARM_SENSORS.has(classOf(p, s))],
  ["openings", "mdi:door", (p, s) => p.domain === "binary_sensor" && OPENINGS.has(classOf(p, s))],
  ["presence", "mdi:motion-sensor", (p, s) => p.domain === "binary_sensor" && PRESENCE.has(classOf(p, s))],
  ["cameras", "mdi:cctv", (p) => p.domain === "camera"],
];

export function SecurityTab({ wall }: { wall: Wall }) {
  const words = t();
  const items = wall.placed.filter((p) => p.tab === SECURITY);
  const houseAreas = useMemo(() => new Set(Object.keys(wall.areas)), [wall.areas]);
  const room = (p: Placed) => (p.areaId ? wall.areas[p.areaId]?.name : undefined);
  const issues = securityIssues(items, wall.states);
  const lang = language();
  if (!items.length) {
    return <Empty>{words.noSecurity}</Empty>;
  }
  const rest = items.filter((p) => !GROUPS.some(([, , f]) => f(p, wall.states)));
  return (
    <div css={css`display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 360px; @media (max-width: 1000px) { grid-template-columns: 1fr; }`}>
      <div>
        <div role="status" css={[glass, tinted(issues.length ? colours.bad : colours.good), css`padding: 18px 20px; display: flex; align-items: center; gap: 14px;`]}>
          <Icon icon={issues.length ? "mdi:shield-alert" : "mdi:shield-check"} width={40} aria-hidden="true" css={css`color: ${issues.length ? colours.bad : colours.good};`} />
          <div>
            <div css={css`font-size: 18px; font-weight: 700;`}>{issues.length ? words.toCheck(issues.length) : words.allSecure}</div>
            {issues.length > 0 && <div css={css`color: ${colours.text};`}>{issues.map((i) => words.issue[i.kind](i.name)).join(" · ")}</div>}
          </div>
        </div>
        {GROUPS.map(([key, icon, match]) => {
          const group = items.filter((p) => match(p, wall.states));
          if (!group.length) return null;
          return (
            <div key={key}>
              <div css={sectionTitle}><Icon icon={icon} width={18} />{words[key] as string}</div>
              <div css={gridOf(key === "cameras" ? 320 : 220)}>
                {group.map((p) => <DeviceControl key={p.key} item={p} states={wall.states} room={room(p)} lang={lang} />)}
              </div>
            </div>
          );
        })}
        {rest.length > 0 && (
          <div>
            <div css={sectionTitle}><Icon icon="mdi:tag-outline" width={18} />{words.alsoHere}</div>
            <div css={gridOf(220)}>{rest.map((p) => <DeviceControl key={p.key} item={p} states={wall.states} room={room(p)} lang={lang} />)}</div>
          </div>
        )}
      </div>
      <aside css={css`display: flex; flex-direction: column; gap: 14px;`}>
        <Batteries areaIds={houseAreas} entities={wall.entities} devices={wall.devices} />
      </aside>
    </div>
  );
}
