import { useEffect } from "react";
import { HassConnect } from "@hakit/core";
import { ThemeProvider } from "@hakit/components";
import { css, Global } from "@emotion/react";
import { Wall } from "./Wall.tsx";
import { colours } from "./ui.tsx";
import { t } from "./i18n.ts";

// Served by Home Assistant itself, so the page's own address is Home Assistant's, and the sign-in Home Assistant keeps
// in this browser is used as it is. VITE_HA_URL exists only for local development (.env.development.local).
const hassUrl = (import.meta.env.VITE_HA_URL as string | undefined) || window.location.origin;

const pageCss = css`
  html, body, #root { margin: 0; min-height: 100%; }
  body {
    background: radial-gradient(1200px 700px at 15% -10%, #23305e 0%, transparent 60%),
      radial-gradient(900px 600px at 110% 20%, #3a2350 0%, transparent 55%), ${colours.page};
    background-attachment: fixed;
    color: ${colours.text};
    font-family: "Segoe UI", Roboto, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 8px; }
`;

const centred = css`display: grid; place-items: center; align-content: center; gap: 8px; height: 100vh; color: ${colours.muted}; font-size: 18px;
  text-align: center; padding: 0 24px;`;

function Splash() {
  return <div css={centred}>{t().connecting}</div>;
}

/** Home Assistant (or the internet on the way to it) cannot be reached: say so plainly and try again in half a minute.
 *  No sign-out link: a child tapping it would sign the wall out. */
function Reconnecting() {
  useEffect(() => {
    const timer = setTimeout(() => location.reload(), 30_000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div role="status" css={centred}>
      <div>{t().reconnecting}</div>
      <div css={css`font-size: 14px;`}>{t().reconnectingHint}</div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Global styles={pageCss} />
      <HassConnect hassUrl={hassUrl} loading={<Splash />} options={{ renderError: () => <Reconnecting /> }}>
        <ThemeProvider darkMode hue={228} saturation={30} lightness={52} tint={0.55} />
        <Wall />
      </HassConnect>
    </>
  );
}
