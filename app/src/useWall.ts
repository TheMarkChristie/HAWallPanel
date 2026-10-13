/* The live wall: Home Assistant's registries and states from the kit's store, the label registry fetched here, turned
 * into tabs and placed devices by model.ts; plus the one write the wall makes, moving a device to another tab. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHass } from "@hakit/core";
import {
  buildTabs, place, tabOfLabel, relabel, labelNameFor, HIDDEN, LABEL_PREFIX,
  type AreaLite, type DeviceLite, type EntityRegLite, type FloorLite, type LabelLite, type Placed, type StateLite, type Tab,
} from "./model.ts";

export interface Wall {
  tabs: Tab[];
  placed: Placed[];
  areas: Record<string, AreaLite>;
  devices: Record<string, DeviceLite>;
  entities: Record<string, EntityRegLite>;
  states: Record<string, StateLite>;
  labels: Record<string, LabelLite>;
  isAdmin: boolean;
  /** Put a device on a tab (a tab key or HIDDEN), or back to automatic (null): writes "Wall: ..." labels. Admin only. */
  assign: (item: Placed, target: string | null) => Promise<void>;
}

export function useWall(): Wall {
  const floors = useHass((s) => s.floors) as unknown as Record<string, FloorLite>;
  const areas = useHass((s) => s.areas) as unknown as Record<string, AreaLite>;
  const devices = useHass((s) => s.devices) as unknown as Record<string, DeviceLite>;
  const entities = useHass((s) => s.entitiesRegistryDisplay) as unknown as Record<string, EntityRegLite>;
  const states = useHass((s) => s.entities) as unknown as Record<string, StateLite>;
  const connection = useHass((s) => s.connection);
  const user = useHass((s) => s.user);
  const [labels, setLabels] = useState<Record<string, LabelLite>>({});

  const loadLabels = useCallback(async () => {
    if (!connection) return;
    try {
      const list = await connection.sendMessagePromise<LabelLite[]>({ type: "config/label_registry/list" });
      setLabels(Object.fromEntries(list.map((l) => [l.label_id, { label_id: l.label_id, name: l.name }])));
    } catch (err) {
      console.warn("Wall Panel: the label registry could not be read; labels are ignored", err);
    }
  }, [connection]);

  useEffect(() => {
    if (!connection) return;
    void loadLabels();
    let stop: (() => void) | undefined;
    connection.subscribeEvents(() => void loadLabels(), "label_registry_updated")
      .then((unsub) => { stop = unsub; })
      .catch(() => { /* not allowed for this user: labels load once */ });
    return () => stop?.();
  }, [connection, loadLabels]);

  const tabs = useMemo(() => buildTabs(Object.values(floors ?? {})), [floors]);
  const placed = useMemo(
    () => place({ tabs, areas: areas ?? {}, devices: devices ?? {}, entities: entities ?? {}, states: states ?? {}, labels }),
    [tabs, areas, devices, entities, states, labels],
  );

  const assign = useCallback(async (item: Placed, target: string | null) => {
    if (!connection) return;
    let labelId: string | null = null;
    let known = labels;
    if (target) {
      const existing = Object.values(labels).find((l) => tabOfLabel(l, tabs) === target);
      if (existing) {
        labelId = existing.label_id;
      } else {
        const tab = target === HIDDEN ? HIDDEN : tabs.find((t) => t.key === target);
        if (!tab) return;
        const made = await connection.sendMessagePromise<{ label_id: string; name: string }>({
          type: "config/label_registry/create", name: labelNameFor(tab), icon: "mdi:tablet-dashboard", color: "indigo",
        });
        labelId = made.label_id;
        known = { ...labels, [made.label_id]: { label_id: made.label_id, name: made.name } };
      }
    }
    const isWall = (id: string) => (known[id]?.name ?? "").trim().toLowerCase().startsWith(LABEL_PREFIX);
    if (item.deviceId) {
      const device = devices[item.deviceId];
      await connection.sendMessagePromise({
        type: "config/device_registry/update", device_id: item.deviceId, labels: relabel(device?.labels ?? [], target, known, labelId),
      });
      // a wall label on one of the device's entities would still win: clear those, the device's label decides
      for (const id of item.entities) {
        const current = entities[id]?.labels ?? [];
        if (current.some(isWall)) {
          await connection.sendMessagePromise({ type: "config/entity_registry/update", entity_id: id, labels: relabel(current, null, known, null) });
        }
      }
    } else {
      const current = entities[item.primary]?.labels ?? [];
      await connection.sendMessagePromise({
        type: "config/entity_registry/update", entity_id: item.primary, labels: relabel(current, target, known, labelId),
      });
    }
    await loadLabels();
  }, [connection, labels, tabs, devices, entities, loadLabels]);

  return {
    tabs, placed, labels, assign,
    areas: areas ?? {}, devices: devices ?? {}, entities: entities ?? {}, states: states ?? {},
    isAdmin: Boolean((user as { is_admin?: boolean } | null)?.is_admin),
  };
}
