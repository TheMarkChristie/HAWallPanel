import { HassConnect } from "@hakit/core";
import { ThemeProvider } from "@hakit/components";
import { css, Global } from "@emotion/react";
import { Wall } from "./Wall.tsx";
import { colours } from "./ui.tsx";

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

function Splash() {
  return <div css={css`display: grid; place-items: center; height: 100vh; color: ${colours.muted}; font-size: 18px;`}>Connecting to Home Assistant...</div>;
}

export default function App() {
  return (
    <>
      <Global styles={pageCss} />
      <HassConnect hassUrl={hassUrl} loading={<Splash />}>
        <ThemeProvider darkMode hue={228} saturation={30} lightness={52} tint={0.55} />
        <Wall />
      </HassConnect>
    </>
  );
}
