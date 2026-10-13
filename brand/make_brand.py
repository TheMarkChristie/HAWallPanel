"""Draw the Wall Panel icon and logo for HACS and the integrations page (custom_components/wall_panel/brand/).

A rounded indigo square holding a dark tablet; on its screen, four room tiles, one lit warm the way a room with its
lights on looks on the wall. PNG only, drawn with Pillow: no fonts, so it renders the same on any machine.

    python brand/make_brand.py
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "custom_components", "wall_panel", "brand")

INDIGO = (124, 140, 255, 255)
SCREEN = (16, 21, 42, 255)
TILE = (58, 68, 110, 255)
WARM = (255, 181, 71, 255)
LIGHT = (238, 241, 251, 255)


def icon(size: int) -> Image.Image:
    s = size / 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(56 * s), fill=INDIGO)
    # the tablet, landscape, with its screen
    d.rounded_rectangle([int(30 * s), int(56 * s), int(226 * s), int(200 * s)], radius=int(20 * s), fill=SCREEN)
    # a tab bar across the top of the screen
    d.rounded_rectangle([int(52 * s), int(72 * s), int(148 * s), int(86 * s)], radius=int(7 * s), fill=TILE)
    d.rounded_rectangle([int(52 * s), int(72 * s), int(82 * s), int(86 * s)], radius=int(7 * s), fill=INDIGO)
    # four room tiles, one lit
    for i, (x, y) in enumerate(((52, 98), (130, 98), (52, 148), (130, 148))):
        fill = WARM if i == 1 else TILE
        d.rounded_rectangle([int(x * s), int(y * s), int((x + 70) * s), int((y + 40) * s)], radius=int(9 * s), fill=fill)
    return img


def logo(width: int, height: int) -> Image.Image:
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    img.alpha_composite(icon(height), (0, 0))
    d = ImageDraw.Draw(img)
    # a wordmark drawn as bars (no font): "Wall Panel" is in the manifest; the logo only has to be recognisable
    x0, y = int(height * 1.18), int(height * 0.30)
    d.rounded_rectangle([x0, y, x0 + int(height * 1.9), y + int(height * 0.16)], radius=int(height * 0.08), fill=LIGHT)
    d.rounded_rectangle([x0, y + int(height * 0.28), x0 + int(height * 1.4), y + int(height * 0.44)], radius=int(height * 0.08), fill=INDIGO)
    return img


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    icon(256).save(os.path.join(OUT, "icon.png"))
    icon(512).save(os.path.join(OUT, "icon@2x.png"))
    for name, w, h in (("logo.png", 972, 256), ("logo@2x.png", 1944, 512), ("dark_logo.png", 972, 256), ("dark_logo@2x.png", 1944, 512)):
        logo(w, h).save(os.path.join(OUT, name))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
