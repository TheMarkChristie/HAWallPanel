"""Preview the wall against a live Home Assistant, before it is released: runs the app's dev server locally, opens it in
Edge (headless) signed in with the long-lived token from V:\\PCF\\HomeAssistant\\.env (written into the browser's storage
only, never into a file or the build), clicks through every tab and saves a screenshot of each.

  python scripts/preview.py [--size 1280x800] [--cpu 1] [--tabs "Entrance floor,Lower floor,Tasks,Security"]

Reads only: nothing is clicked except the tab buttons. Screenshots land in scripts/preview_<tab>.png (gitignored).
"""
import argparse
import json
import os
import re
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(os.path.dirname(HERE), "app")
ENV = r"V:\PCF\HomeAssistant\.env"
PORT = 5199


def env():
    out = {}
    for line in open(ENV, encoding="utf-8"):
        if "=" in line and not line.startswith("#"):
            k, v = line.strip().split("=", 1)
            out[k] = v.strip().strip('"')
    return out


def wait_port(port, seconds=60):
    end = time.time() + seconds
    while time.time() < end:
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return True
        time.sleep(0.5)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", default="1280x800")
    ap.add_argument("--cpu", type=float, default=1)
    ap.add_argument("--tabs", default="")
    ap.add_argument("--wait", type=float, default=6)
    ap.add_argument("--room", default="", help="also open this room on the first tab and screenshot it")
    ap.add_argument("--edit", action="store_true", help="also open Edit and screenshot it (nothing is changed)")
    a = ap.parse_args()
    e = env()
    base = e["HA_URL"].rstrip("/")
    with open(os.path.join(APP, ".env.development.local"), "w", encoding="utf-8") as fh:
        fh.write("VITE_HA_URL=%s\n" % base)        # the address only; the token stays out of every file
    server = subprocess.Popen("npx vite --host 127.0.0.1 --port %d --strictPort" % PORT, cwd=APP, shell=True,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not wait_port(PORT):
            sys.exit("the dev server did not start on port %d" % PORT)
        w, h = (int(x) for x in a.size.split("x"))
        errors = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, channel="msedge")
            ctx = browser.new_context(viewport={"width": w, "height": h}, locale="en-GB", timezone_id="Europe/Oslo")
            page = ctx.new_page()
            if a.cpu > 1:
                ctx.new_cdp_session(page).send("Emulation.setCPUThrottlingRate", {"rate": a.cpu})
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("response", lambda r: errors.append("HTTP %d %s" % (r.status, r.url)) if r.status >= 400 else None)
            local = "http://127.0.0.1:%d/" % PORT
            # the sign-in goes in before any page script runs, so the app never sends the browser to the login page
            ctx.add_init_script("""(([url, tok, origin]) => { if (location.origin === origin) localStorage.setItem("hassTokens", JSON.stringify({
                access_token: tok, token_type: "Bearer", expires_in: 1800, expires: Date.now() + 10 * 365 * 86400000,
                refresh_token: null, hassUrl: url, clientId: origin + "/" })); })(%s)""" % json.dumps([base, e["HA_TOKEN"], local.rstrip("/")]))
            page.goto(local, wait_until="domcontentloaded", timeout=120000)
            page.wait_for_selector("nav[aria-label='Wall tabs'] button", timeout=90000)
            time.sleep(a.wait)
            names = [t.strip() for t in a.tabs.split(",") if t.strip()] or \
                [b.inner_text().strip() for b in page.query_selector_all("nav[aria-label='Wall tabs'] button")]
            print("tabs:", names)
            for name in names:
                page.click("nav[aria-label='Wall tabs'] button:has-text('%s')" % name)
                time.sleep(a.wait)
                slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
                out = os.path.join(HERE, "preview_%s.png" % slug)
                page.screenshot(path=out, full_page=True)
                info = page.evaluate("""() => ({
                    rooms: document.querySelectorAll("main [role=button][aria-label]").length,
                    text: document.querySelector("main")?.innerText.replace(/\\s+/g, " ").slice(0, 300) })""")
                print("%-16s %s  rooms=%s  | %s" % (name, out, info["rooms"], info["text"][:200]))
            if a.room:
                page.click("nav[aria-label='Wall tabs'] button >> nth=0")
                time.sleep(a.wait / 2)
                page.click("main [role=button][aria-label^='%s']" % a.room)
                time.sleep(a.wait)
                out = os.path.join(HERE, "preview_room.png")
                page.screenshot(path=out)
                print("room %-11s %s" % (a.room, out))
                page.keyboard.press("Escape")
                time.sleep(1.5)
            if a.edit:
                page.click("button[aria-label='Edit where devices live']")
                time.sleep(a.wait)
                out = os.path.join(HERE, "preview_edit.png")
                page.screenshot(path=out)
                rows = page.evaluate("() => document.querySelectorAll(\"select[aria-label^='Home tab for']\").length")
                print("edit             %s  devices listed=%s" % (out, rows))
            browser.close()
        token = e["HA_TOKEN"]
        shown = [x.replace(token, "<token>") for x in errors if "favicon" not in x]
        print("browser errors:", len(shown))
        for x in shown[:12]:
            print("  ", x[:300])
    finally:
        subprocess.run("taskkill /F /T /PID %d" % server.pid, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
