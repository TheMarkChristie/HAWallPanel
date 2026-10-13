/* Shared look: the glass panels, the round buttons and the colours, in one place. */
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const colours = {
  page: "#0b1020",
  text: "#eef1fb",
  muted: "rgba(238, 241, 251, 0.62)",
  faint: "rgba(238, 241, 251, 0.38)",
  glass: "rgba(255, 255, 255, 0.045)",
  glassHi: "rgba(255, 255, 255, 0.08)",
  edge: "rgba(255, 255, 255, 0.09)",
  accent: "#7c8cff",
  warm: "#ffb547",
  good: "#4cd38a",
  bad: "#ff5a6a",
  cool: "#5ac8ff",
};

/** The text settings every button and input on the wall uses. */
export const buttonFont = "font-family: inherit; font-size: 15px";

export const glass = css`
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025));
  border: 1px solid ${colours.edge};
  border-radius: 20px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
`;

/** A tinted glass panel: tone is a colour the panel leans towards (on lights, an open door, a low battery). */
export const tinted = (tone: string) => css`
  background: linear-gradient(160deg, ${tone}33, ${tone}12 55%, rgba(255, 255, 255, 0.02));
  border-color: ${tone}55;
`;

export function Panel({ title, icon, sub, children, tone, action }: {
  title?: ReactNode; icon?: string; sub?: ReactNode; children?: ReactNode; tone?: string; action?: ReactNode;
}) {
  return (
    <section css={[glass, tone ? tinted(tone) : null, css`padding: 16px 18px;`]}>
      {(title || icon) && (
        <header css={css`display: flex; align-items: center; gap: 12px; margin-bottom: 10px;`}>
          {icon && <span css={[roundIcon(40), tone ? css`background: ${tone}; color: #10131f;` : null]}><Icon icon={icon} width={22} /></span>}
          <div css={css`flex: 1; min-width: 0;`}>
            <div css={css`font-weight: 650; font-size: 16px;`}>{title}</div>
            {sub && <div css={css`color: ${colours.muted}; font-size: 13px;`}>{sub}</div>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export const roundIcon = (size: number) => css`
  width: ${size}px; height: ${size}px; flex: 0 0 ${size}px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: ${colours.glassHi}; color: ${colours.text};
`;

/** A round button: on when `on`, warm tint for lights, accent otherwise. */
export function RoundButton({ icon, on, tone, title, onClick, size = 40, badge }: {
  icon: string; on?: boolean; tone?: string; title?: string; onClick?: (e: React.MouseEvent) => void; size?: number; badge?: ReactNode;
}) {
  const t = tone ?? colours.warm;
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={on}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      css={[roundIcon(size), css`
        position: relative; border: 1px solid ${colours.edge}; cursor: pointer; transition: transform 0.12s, background 0.2s;
        &:active { transform: scale(0.93); }
        &:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 2px; }
      `, on ? css`background: ${t}; color: #15130c; border-color: transparent; box-shadow: 0 0 18px ${t}66;` : null]}
    >
      <Icon icon={icon} width={size * 0.5} />
      {badge != null && (
        <span css={css`position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
          background: #2b3256; color: ${colours.text}; font-size: 11px; font-weight: 700; display: grid; place-items: center;`}>{badge}</span>
      )}
    </button>
  );
}

export const gridOf = (min: number) => css`
  display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(${min}px, 1fr)); align-items: start;
`;

export const sectionTitle = css`
  display: flex; align-items: center; gap: 8px; margin: 22px 4px 10px; color: ${colours.muted};
  font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
`;

export function Empty({ children }: { children: ReactNode }) {
  return <div css={[glass, css`padding: 22px; color: ${colours.muted}; text-align: center;`]}>{children}</div>;
}

export const WEATHER_ICONS: Record<string, string> = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline", fog: "mdi:weather-fog",
  hail: "mdi:weather-hail", lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant",
};

/** Default icons by domain, for things that carry none. */
export function iconFor(domain: string, deviceClass?: unknown, on?: boolean): string {
  switch (domain) {
    case "light": return on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline";
    case "switch": return on ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline";
    case "fan": return on ? "mdi:fan" : "mdi:fan-off";
    case "cover": return on ? "mdi:window-shutter-open" : "mdi:window-shutter";
    case "lock": return on ? "mdi:lock-open-variant" : "mdi:lock";
    case "climate": return "mdi:thermostat";
    case "media_player": return on ? "mdi:television-play" : "mdi:television";
    case "vacuum": return "mdi:robot-vacuum";
    case "lawn_mower": return "mdi:robot-mower";
    case "camera": return "mdi:cctv";
    case "alarm_control_panel": return "mdi:shield-home";
    case "scene": return "mdi:palette";
    case "script": return "mdi:script-text-play";
    case "binary_sensor":
      if (deviceClass === "window") return on ? "mdi:window-open-variant" : "mdi:window-closed-variant";
      if (deviceClass === "garage_door") return on ? "mdi:garage-open" : "mdi:garage";
      if (deviceClass === "motion" || deviceClass === "occupancy" || deviceClass === "presence") return on ? "mdi:motion-sensor" : "mdi:motion-sensor-off";
      if (deviceClass === "smoke" || deviceClass === "gas" || deviceClass === "carbon_monoxide") return on ? "mdi:smoke-detector-alert" : "mdi:smoke-detector";
      if (deviceClass === "moisture") return on ? "mdi:water-alert" : "mdi:water-off";
      return on ? "mdi:door-open" : "mdi:door-closed";
    case "sensor":
      if (deviceClass === "humidity") return "mdi:water-percent";
      if (deviceClass === "carbon_dioxide") return "mdi:molecule-co2";
      if (deviceClass === "pm25" || deviceClass === "pm10") return "mdi:blur";
      return "mdi:thermometer";
    case "water_heater": return "mdi:water-boiler";
    case "humidifier": return "mdi:air-humidifier";
    case "valve": return on ? "mdi:valve-open" : "mdi:valve-closed";
    default: return "mdi:help-circle-outline";
  }
}

/** A centred sheet over the wall (rooms, Edit, confirmations): Escape or a tap outside closes it. */
export function Sheet({ open, title, onClose, children, width = 1100 }: {
  open: boolean; title?: ReactNode; onClose: () => void; children?: ReactNode; width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} onClick={onClose} css={css`
      position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 3vh 3vw;
      background: rgba(5, 8, 20, 0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);`}>
      <div onClick={(e) => e.stopPropagation()} css={css`
        width: min(${width}px, 94vw); max-height: 94vh; display: flex; flex-direction: column; border-radius: 24px;
        background: #151a30; border: 1px solid ${colours.edge}; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5); color: ${colours.text};`}>
        <header css={css`display: flex; align-items: center; gap: 12px; padding: 18px 22px 8px;`}>
          <div css={css`flex: 1; font-size: 22px; font-weight: 750;`}>{title}</div>
          <button onClick={onClose} aria-label="Close" css={[roundIcon(44), css`border: 1px solid ${colours.edge}; cursor: pointer;`]}>
            <Icon icon="mdi:close" width={24} />
          </button>
        </header>
        <div css={css`padding: 8px 22px 22px; overflow: auto;`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
