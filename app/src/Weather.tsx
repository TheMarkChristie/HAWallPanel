/* The weather panel: the temperature large, the condition, humidity, wind and pressure, and the next five days with a
 * curve through their highs, drawn here rather than by the kit's card, which lays out poorly in a narrow column. */
import { css } from "@emotion/react";
import { Icon } from "@iconify/react";
import { useWeather } from "@hakit/core";
import { colours, glass, WEATHER_ICONS } from "./ui.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const CONDITION: Record<string, string> = {
  "clear-night": "Clear", cloudy: "Cloudy", fog: "Fog", hail: "Hail", lightning: "Thunder", "lightning-rainy": "Thunder showers",
  partlycloudy: "Partly cloudy", pouring: "Heavy rain", rainy: "Rain", snowy: "Snow", "snowy-rainy": "Sleet", sunny: "Sunny",
  windy: "Windy", "windy-variant": "Windy", exceptional: "Warning",
};

export function WeatherPanel({ entityId, locale }: { entityId: string; locale: string }) {
  const w = useWeather(entityId as Any, { type: "daily" }) as Any;
  if (!w) return null;
  const a = w.attributes ?? {};
  const unit = a.temperature_unit ?? "°C";
  const days: { datetime: string; temperature: number; templow?: number; condition?: string }[] = (w.forecast?.forecast ?? []).slice(0, 5);
  const highs = days.map((d) => d.temperature);
  const min = Math.min(...highs), max = Math.max(...highs);
  const span = max - min || 1;
  const points = highs.map((t, i) => `${(i + 0.5) * (300 / Math.max(days.length, 1))},${46 - ((t - min) / span) * 34}`).join(" ");
  const day = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return (
    <section css={[glass, css`padding: 18px 20px; background: linear-gradient(160deg, rgba(150, 175, 220, 0.22), rgba(255, 255, 255, 0.03));`]}>
      <div css={css`display: flex; align-items: center; gap: 14px;`}>
        <Icon icon={WEATHER_ICONS[w.state] ?? "mdi:weather-cloudy"} width={56} />
        <div>
          <div css={css`font-size: 44px; font-weight: 750; line-height: 1;`}>{a.temperature != null ? Math.round(a.temperature) : "-"}{unit}</div>
          <div css={css`color: ${colours.muted}; margin-top: 4px;`}>{CONDITION[w.state] ?? w.state}</div>
        </div>
      </div>
      {days.length > 1 && (
        <div css={css`margin-top: 14px;`}>
          <svg viewBox="0 0 300 56" width="100%" height="56" aria-hidden="true" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {highs.map((t, i) => <circle key={i} cx={(i + 0.5) * (300 / days.length)} cy={46 - ((t - min) / span) * 34} r="3" fill="#fff" />)}
          </svg>
          <div css={css`display: grid; grid-template-columns: repeat(${days.length}, 1fr); text-align: center; font-size: 13px;`}>
            {days.map((d) => (
              <div key={d.datetime}>
                <div css={css`color: ${colours.muted};`}>{day.format(new Date(d.datetime))}</div>
                <Icon icon={WEATHER_ICONS[d.condition ?? ""] ?? "mdi:weather-cloudy"} width={22} css={css`margin: 4px 0;`} />
                <div css={css`font-weight: 650;`}>{Math.round(d.temperature)}°</div>
                {d.templow != null && <div css={css`color: ${colours.faint};`}>{Math.round(d.templow)}°</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div css={css`display: flex; justify-content: space-around; margin-top: 14px; padding-top: 12px; border-top: 1px solid ${colours.edge}; font-size: 14px;`}>
        {a.humidity != null && <Detail icon="mdi:water-percent" text={`${Math.round(a.humidity)}%`} />}
        {a.wind_speed != null && <Detail icon="mdi:weather-windy" text={`${Math.round(a.wind_speed)} ${a.wind_speed_unit ?? ""}`} />}
        {a.pressure != null && <Detail icon="mdi:gauge" text={`${Math.round(a.pressure)} ${a.pressure_unit ?? ""}`} />}
      </div>
    </section>
  );
}

function Detail({ icon, text }: { icon: string; text: string }) {
  return <span css={css`display: inline-flex; align-items: center; gap: 5px;`}><Icon icon={icon} width={18} css={css`color: ${colours.cool};`} />{text}</span>;
}
