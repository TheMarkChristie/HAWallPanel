/* Tasks: everyone's chores for today and the household's lists, read from the Family Board sensors and ticked or added
 * to straight into Microsoft To Do through Home Assistant's to-do services; plus anything given the "Wall: Tasks" label. */
import { useState } from "react";
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { call, DeviceControl } from "./Device.tsx";
import { colours, gridOf, Panel, sectionTitle, Empty, buttonFont } from "./ui.tsx";
import { initialsFor, TASKS, type StateLite } from "./model.ts";
import type { Wall } from "./useWall.ts";

interface Chore { uid: string; title: string; points: number; due: string | null; overdue?: boolean }
interface Person { id: string; name: string; colour: string }
interface ListItem { uid: string; summary: string; note: string | null; due: string | null }
interface TodoList { entity: string; name: string; open: ListItem[]; open_count: number }

const attr = <T,>(st: StateLite, key: string, fallback: T): T => (st.attributes[key] as T) ?? fallback;

export function TasksTab({ wall }: { wall: Wall }) {
  const sensors = Object.values(wall.states);
  const chores = sensors.filter((s) => s.attributes.family_board === "chores");
  const order = (s: StateLite) => attr<Person[]>(s, "people", []).findIndex((p) => p.id === attr<Person | null>(s, "person", null)?.id);
  chores.sort((a, b) => order(a) - order(b));
  const listsSensor = sensors.find((s) => s.attributes.family_board === "lists");
  const lists = (listsSensor ? attr<TodoList[]>(listsSensor, "lists", []) : []).slice().sort((a, b) => Number(b.open_count > 0) - Number(a.open_count > 0));
  const names = chores.map((s) => attr<Person | null>(s, "person", null)?.name ?? "?");
  const marks = initialsFor(names);
  const labelled = wall.placed.filter((p) => p.tab === TASKS);
  if (!chores.length && !listsSensor && !labelled.length) {
    return <Empty>Chores and lists come from the Family Board integration. Install it, or give a device the "Wall: Tasks" label.</Empty>;
  }
  return (
    <div>
      {chores.length > 0 && (
        <>
          <div css={sectionTitle}><Icon icon="mdi:broom" width={18} />Chores today</div>
          <div css={gridOf(300)}>{chores.map((s, i) => <PersonChores key={s.entity_id} sensor={s} initials={marks[i]} />)}</div>
        </>
      )}
      {lists.length > 0 && (
        <>
          <div css={sectionTitle}><Icon icon="mdi:format-list-checks" width={18} />Lists</div>
          <div css={gridOf(300)}>{lists.map((l) => <ListPanel key={l.entity} list={l} />)}</div>
        </>
      )}
      {labelled.length > 0 && (
        <>
          <div css={sectionTitle}><Icon icon="mdi:tag-outline" width={18} />Also here</div>
          <div css={gridOf(220)}>{labelled.map((p) => <DeviceControl key={p.key} item={p} states={wall.states} />)}</div>
        </>
      )}
    </div>
  );
}

function PersonChores({ sensor, initials }: { sensor: StateLite; initials: string }) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const person = attr<Person | null>(sensor, "person", null);
  const open = attr<Chore[]>(sensor, "open", []);
  const done = attr<Chore[]>(sensor, "done_today", []);
  const todo = attr<string | null>(sensor, "todo_entity", null);
  const week = attr<number>(sensor, "points_week", 0);
  const tick = (c: Chore) => {
    if (!todo) return;
    setPending((p) => new Set(p).add(c.uid));
    call("todo", "update_item", todo, { item: c.uid, status: "completed" });
  };
  return (
    <Panel
      title={person?.name ?? sensor.entity_id}
      sub={`${week} ${week === 1 ? "point" : "points"} this week`}
      action={<span css={css`width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-weight: 700;
        border: 2px solid ${person?.colour ?? colours.accent}; background: ${person?.colour ?? colours.accent}33;`}>{initials}</span>}
    >
      {!open.length && !done.length && <div css={css`color: ${colours.muted};`}>Nothing to do today</div>}
      {open.map((c) => (
        <Row key={c.uid} done={pending.has(c.uid)} onTick={() => tick(c)} title={c.title}
          sub={c.overdue ? "Overdue" : c.due ? "Today" : undefined} late={c.overdue} right={`${c.points} pt`} />
      ))}
      {done.map((c) => <Row key={c.uid} done title={c.title} right={`${c.points} pt`} />)}
    </Panel>
  );
}

function ListPanel({ list }: { list: TodoList }) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const add = () => {
    const item = text.trim();
    if (!item) return;
    call("todo", "add_item", list.entity, { item });
    setText("");
  };
  return (
    <Panel title={list.name} sub={`${list.open_count} open`} icon={/tesco|rema|kiwi|coop|meny|shop|ikea/i.test(list.name) ? "mdi:cart-outline" : "mdi:format-list-checks"}>
      {list.open.slice(0, 8).map((i) => (
        <Row key={i.uid} done={pending.has(i.uid)} title={i.summary} sub={i.note ?? undefined}
          onTick={() => { setPending((p) => new Set(p).add(i.uid)); call("todo", "update_item", list.entity, { item: i.uid, status: "completed" }); }} />
      ))}
      {list.open.length > 8 && <div css={css`color: ${colours.muted}; font-size: 13px; padding: 4px 0;`}>+{list.open.length - 8} more</div>}
      <form onSubmit={(e) => { e.preventDefault(); add(); }} css={css`display: flex; gap: 8px; margin-top: 10px;`}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an item" aria-label={`Add to ${list.name}`}
          css={css`flex: 1; min-width: 0; ${buttonFont}; padding: 10px 12px; border-radius: 12px; color: ${colours.text};
            border: 1px solid ${colours.edge}; background: rgba(0, 0, 0, 0.18);`} />
        <button type="submit" css={css`${buttonFont}; font-weight: 650; padding: 10px 16px; border-radius: 12px; border: none; cursor: pointer;
          background: ${colours.accent}; color: #0d1022;`}>Add</button>
      </form>
    </Panel>
  );
}

function Row({ title, sub, right, done, late, onTick }: {
  title: string; sub?: string; right?: string; done?: boolean; late?: boolean; onTick?: () => void;
}) {
  return (
    <button onClick={onTick} disabled={!onTick || done} css={css`
      display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 2px; background: none; border: none;
      border-top: 1px solid ${colours.edge}; color: ${colours.text}; text-align: left; cursor: ${onTick && !done ? "pointer" : "default"}; ${buttonFont};
      &:first-of-type { border-top: none; }
    `}>
      <Icon icon={done ? "mdi:check-circle" : "mdi:checkbox-blank-circle-outline"} width={24} css={css`color: ${done ? colours.good : colours.faint}; flex: 0 0 24px;`} />
      <span css={css`flex: 1; min-width: 0;`}>
        <span css={css`display: block; ${done ? `text-decoration: line-through; color: ${colours.muted};` : ""}`}>{title}</span>
        {sub && <span css={css`display: block; font-size: 12px; color: ${late ? colours.bad : colours.muted};`}>{sub}</span>}
      </span>
      {right && <span css={css`font-size: 12px; color: ${colours.muted};`}>{right}</span>}
    </button>
  );
}

