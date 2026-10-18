/* Low batteries, limited to the rooms given (a floor, or the whole house), so the other house's devices stay out. */
import { css } from "@emotion/react";
import { useLowDevices } from "@hakit/core";
import { colours, Panel } from "./ui.tsx";
import { decodeEntities, type DeviceLite, type EntityRegLite } from "./model.ts";
import { t } from "./i18n.ts";

export const LOW_BATTERY = 25;

export function Batteries({ areaIds, entities, devices }: {
  areaIds: Set<string>; entities: Record<string, EntityRegLite>; devices: Record<string, DeviceLite>;
}) {
  const low = useLowDevices({ min: 0, max: LOW_BATTERY });
  const mine = low.filter((st) => {
    const reg = entities[st.entity_id];
    const area = reg?.area_id || (reg?.device_id ? devices[reg.device_id]?.area_id : null);
    return !!area && areaIds.has(area);
  });
  if (!mine.length) {
    return <Panel icon="mdi:battery-check" title={t().batteries} sub={t().allAbove(LOW_BATTERY)} />;
  }
  const values = mine.map((st) => Number(st.state)).filter((n) => !Number.isNaN(n));
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  return (
    <Panel icon="mdi:battery-alert-variant-outline" tone={colours.bad} title={t().batteries} sub={t().lowAverage(mine.length, avg)}>
      {mine.map((st) => {
        const reg = entities[st.entity_id];
        const device = reg?.device_id ? devices[reg.device_id] : undefined;
        const name = decodeEntities(device?.name_by_user || device?.name || String(st.attributes.friendly_name ?? st.entity_id));
        return (
          <div key={st.entity_id} css={css`display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px;`}>
            <span>{name}</span>
            <span css={css`color: ${colours.bad}; font-weight: 650;`}>{Math.round(Number(st.state))}%</span>
          </div>
        );
      })}
    </Panel>
  );
}
