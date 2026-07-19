#!/usr/bin/env python3
"""Remove white background from ORDO logo and save for web."""
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\syrga\.cursor\projects\c-Users-syrga-IdeaProjects-restaurant-order-service\assets"
    r"\c__Users_syrga_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_"
    r"photo_5390844686118885621_w__1_-5fc8e6c0-7c3e-4ebf-8389-4ab925afb15d.png"
)
OUT_DIR = Path(__file__).resolve().parents[1] / "src" / "main" / "resources" / "static" / "restaurant" / "ordo-cafe"
OUT = OUT_DIR / "logo.png"


def apply_circle_mask(img: Image.Image, inset: float = 0.02) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    cx, cy = w / 2, h / 2
    radius = min(w, h) / 2 * (1 - inset)
    pixels = img.load()
    r2 = radius * radius
    for y in range(h):
        for x in range(w):
            dx = x - cx + 0.5
            dy = y - cy + 0.5
            if dx * dx + dy * dy > r2:
                pixels[x, y] = (0, 0, 0, 0)
    return img


def remove_white_bg(img: Image.Image, threshold: int = 245) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # near-white background -> transparent
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (r, g, b, 0)
            # soft edge: fade light pixels
            elif r >= 230 and g >= 230 and b >= 230:
                avg = (r + g + b) / 3
                alpha = int(max(0, min(255, (245 - avg) * 12)))
                pixels[x, y] = (r, g, b, alpha)
    return img


def trim_transparent(img: Image.Image, pad: int = 2) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.open(SRC).convert("RGBA")
    img = apply_circle_mask(img, inset=0.008)
    img.save(OUT, "PNG", optimize=True)
    print(f"Saved {OUT} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
