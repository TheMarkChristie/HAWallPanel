"""Build the wall into the integration: the rule tests, the bundled icons, the type check, the Vite build, then the
output copied into custom_components/wall_panel/www (replacing what was there), with a gzip (and, when the brotli module
is installed, a brotli) copy next to every file over 10 kB, which Home Assistant's web server sends to browsers that take
it. Last, the built files are checked for anything that must never ship: the long-lived token, or a fixed Home
Assistant address (the page uses its own origin). The app's version and the integration's must match: the page reloads
itself when Home Assistant reports a newer one.

  python scripts/build.py
"""
import gzip
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
APP = os.path.join(ROOT, "app")
WWW = os.path.join(ROOT, "custom_components", "wall_panel", "www")
MANIFEST = os.path.join(ROOT, "custom_components", "wall_panel", "manifest.json")
ENV = r"V:\PCF\HomeAssistant\.env"
COMPRESS_OVER = 10_000

try:
    import brotli  # type: ignore[import-not-found]
except ImportError:
    brotli = None


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


def compress(folder):
    count = 0
    for base, _dirs, files in os.walk(folder):
        for name in files:
            path = os.path.join(base, name)
            if name.endswith((".gz", ".br")) or os.path.getsize(path) <= COMPRESS_OVER:
                continue
            data = open(path, "rb").read()
            with open(path + ".gz", "wb") as out:
                out.write(gzip.compress(data, compresslevel=9, mtime=0))
            if brotli is not None:
                with open(path + ".br", "wb") as out:
                    out.write(brotli.compress(data, quality=11))
            count += 1
    return count


def main():
    app_version = json.load(open(os.path.join(APP, "package.json"), encoding="utf-8"))["version"]
    integration_version = json.load(open(MANIFEST, encoding="utf-8"))["version"]
    if app_version != integration_version:
        sys.exit("app/package.json says %s and the manifest %s: make them the same" % (app_version, integration_version))
    run("node --test src/model.test.ts")
    run("node scripts/icons.mjs")
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
    packed = compress(os.path.join(WWW, "assets"))
    size = sum(os.path.getsize(os.path.join(f, n)) for f, _d, ns in os.walk(WWW) for n in ns if not n.endswith((".gz", ".br")))
    print("built %s into %s: %d files, %.1f MB, %d compressed copies%s, no token or fixed address inside" % (
        app_version, WWW, sum(1 for _f, _d, ns in os.walk(WWW) for n in ns if not n.endswith((".gz", ".br"))), size / 1e6, packed,
        "" if brotli else " (gzip only: no brotli module)"))


if __name__ == "__main__":
    main()
