/* Edit: every device that could be on the wall, where it is now and why, and a choice of home tab. A choice writes a
 * "Wall: <tab>" label on the device in Home Assistant (the label is created the first time), so the same setting is
 * visible and editable on the device's own page in Home Assistant. Automatic removes the wall labels again. */
import { useMemo, useState } from "react";
import { css } from "@emotion/react";
import { colours, buttonFont, Sheet } from "./ui.tsx";
import { HIDDEN, type Placed, type Why } from "./model.ts";
import type { Wall } from "./useWall.ts";

const WHY: Record<Why, string> = {
  label: "set by a Wall label",
  type: "Security by type",
  floor: "by its room's floor",
  "no-room": "no room in this house",
  "no-floor": "its room has no floor",
  hidden: "hidden by a Wall label",
};


export function EditPanel({ wall, open, onClose }: { wall: Wall; open: boolean; onClose: () => void }) {
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return wall.placed.filter((p) => !f || p.name.toLowerCase().includes(f) || (p.areaId && wall.areas[p.areaId]?.name.toLowerCase().includes(f)));
  }, [wall.placed, wall.areas, filter]);
  const groups: [string, Placed[]][] = [
    ...wall.tabs.map((t) => [t.title, rows.filter((p) => p.tab === t.key)] as [string, Placed[]]),
    ["Not on the wall", rows.filter((p) => p.tab === null)],
  ];
  const current = (p: Placed) => (p.why === "label" ? p.tab ?? "" : p.why === "hidden" ? HIDDEN : "");
  const choose = async (p: Placed, value: string) => {
    setBusy(p.key);
    setError(null);
    try {
      await wall.assign(p, value || null);
    } catch (err) {
      setError(`${p.name}: ${(err as { message?: string })?.message ?? String(err)}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Where each device lives" width={860}>
      <p css={css`margin: 0 0 12px; color: ${colours.muted}; font-size: 14px; line-height: 1.45;`}>
        Automatic follows the room's floor; locks, doors and cameras go to Security. A choice here is saved as a "Wall:" label on the
        device in Home Assistant, where it can be changed too.
      </p>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a device or room" aria-label="Find a device or room"
        css={css`width: 100%; ${buttonFont}; padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; color: ${colours.text};
          border: 1px solid ${colours.edge}; background: rgba(0, 0, 0, 0.2);`} />
      {error && <div role="alert" css={css`color: ${colours.bad}; margin: 6px 0;`}>{error}</div>}
      {groups.map(([title, items]) => items.length > 0 && (
        <div key={title} css={css`margin-top: 14px; width: 100%;`}>
          <div css={css`font-weight: 700; margin-bottom: 4px;`}>{title} <span css={css`color: ${colours.muted}; font-weight: 400;`}>({items.length})</span></div>
          {items.map((p) => (
            <div key={p.key} css={css`display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 12px; align-items: center; width: 100%;
              padding: 8px 0; border-top: 1px solid ${colours.edge};`}>
              <div css={css`min-width: 0;`}>
                <div css={css`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}>{p.name}</div>
                <div css={css`font-size: 12px; color: ${colours.muted};`}>
                  {p.areaId ? wall.areas[p.areaId]?.name : "No room"} · {WHY[p.why]}
                </div>
              </div>
              <select value={current(p)} disabled={busy === p.key} onChange={(e) => void choose(p, e.target.value)}
                aria-label={`Home tab for ${p.name}`}
                css={css`${buttonFont}; padding: 8px 10px; border-radius: 10px; color: ${colours.text}; background: #1a2142; border: 1px solid ${colours.edge};`}>
                <option value="">Automatic</option>
                {wall.tabs.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
                <option value={HIDDEN}>Hidden</option>
              </select>
            </div>
          ))}
        </div>
      ))}
    </Sheet>
  );
}
