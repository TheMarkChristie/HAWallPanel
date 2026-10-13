"""Build the wall into the integration: the rule tests, the type check, the Vite build, then the output copied into
custom_components/wall_panel/www (replacing what was there). Last, the built files are checked for anything that must
never ship: the long-lived token, or a fixed Home Assistant address (the page uses its own origin).

  python scripts/build.py
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
APP = os.path.join(ROOT, "app")
WWW = os.path.join(ROOT, "custom_components", "wall_panel", "www")
ENV = r"V:\PCF\HomeAssistant\.env"


def run(cmd):
    print(">", cmd)
    r = subprocess.run(cmd, cwd=APP, shell=True)
    if r.returncode:
        sys.exit("failed: %s" % cmd)


def secrets():
    out = []
    if os.path.exists(ENV):
        for line in open(ENV, encoding="utf-8"):
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                v = v.strip().strip('"')
                if k in ("HA_TOKEN", "HA_URL", "MS365_CLIENT_SECRET") and len(v) > 8:
                    out.append((k, v.rstrip("/")))
    return out


def main():
    run("node --test src/model.test.ts")
    run("npx tsc -p tsconfig.json")
    run("npx vite build")
    dist = os.path.join(APP, "dist")
    if os.path.isdir(WWW):
        shutil.rmtree(WWW)
    shutil.copytree(dist, WWW)
    found = []
    checks = secrets()
    for folder, _dirs, files in os.walk(WWW):
        for name in files:
            data = open(os.path.join(folder, name), "rb").read()
            for key, value in checks:
                if value.encode() in data:
                    found.append("%s in %s" % (key, name))
    if found:
        shutil.rmtree(WWW)
        sys.exit("STOPPED: the build carries %s; nothing copied" % ", ".join(found))
    size = sum(os.path.getsize(os.path.join(f, n)) for f, _d, ns in os.walk(WWW) for n in ns)
    print("built into %s: %d files, %.1f MB, no token or fixed address inside" % (WWW, sum(len(n) for _f, _d, n in os.walk(WWW)), size / 1e6))


if __name__ == "__main__":
    main()
