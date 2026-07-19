"""Hot-day refreshment edit for ASU 1L water bottle photo."""
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ASSETS = Path(__file__).resolve().parents[1] / "assets"
SRC = ASSETS / "asu-bottle-crop.png"
OUT = ASSETS / "asu-water-summer.png"


def remove_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    corners = [px[0, 0][:3], px[w - 1, 0][:3], px[0, h - 1][:3], px[w - 1, h - 1][:3]]

    def dist(c1, c2):
        return sum(abs(a - b) for a, b in zip(c1, c2))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if dist((r, g, b), corners[0]) < 55 or dist((r, g, b), corners[2]) < 70:
                px[x, y] = (r, g, b, 0)
            elif r > 190 and g > 185 and b > 175 and y < h * 0.55:
                px[x, y] = (r, g, b, 0)
    return img


def summer_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    bg = Image.new("RGB", size)
    draw = ImageDraw.Draw(bg)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(255 * (1 - t * 0.15) + 120 * t)
        g = int(230 * (1 - t * 0.2) + 190 * t)
        b = int(255 * (1 - t * 0.05) + 160 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    sun = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    sd.ellipse((w - 220, 40, w - 40, 220), fill=(255, 245, 180, 90))
    bg = Image.alpha_composite(bg.convert("RGBA"), sun).convert("RGB")
    return bg.filter(ImageFilter.GaussianBlur(1))


def add_condensation(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    random.seed(7)
    w, h = img.size
    for _ in range(140):
        x = random.randint(int(w * 0.18), int(w * 0.82))
        y = random.randint(int(h * 0.08), int(h * 0.92))
        r = random.randint(2, 7)
        alpha = random.randint(40, 110)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(210, 235, 255, alpha))


def main() -> None:
    bottle = remove_background(Image.open(SRC))
    bbox = bottle.getbbox()
    if bbox:
        bottle = bottle.crop(bbox)

    out_w, out_h = 900, 1200
    canvas = summer_background((out_w, out_h))

    target_h = int(out_h * 0.78)
    scale = target_h / bottle.size[1]
    new_size = (int(bottle.size[0] * scale), target_h)
    bottle = bottle.resize(new_size, Image.LANCZOS)

    bottle = ImageEnhance.Color(bottle).enhance(1.15)
    bottle = ImageEnhance.Contrast(bottle).enhance(1.08)
    bottle = ImageEnhance.Brightness(bottle).enhance(1.05)

    overlay = Image.new("RGBA", new_size, (0, 0, 0, 0))
    add_condensation(overlay)
    bottle = Image.alpha_composite(bottle, overlay)

    x = (out_w - new_size[0]) // 2
    y = out_h - new_size[1] - 40
    shadow = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((x + 40, y + new_size[1] - 20, x + new_size[0] - 40, y + new_size[1] + 35), fill=(0, 0, 0, 70))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
    canvas.paste(bottle, (x, y), bottle)

    canvas.save(OUT, "PNG", optimize=True)
    print(f"Saved: {OUT}")


if __name__ == "__main__":
    main()
