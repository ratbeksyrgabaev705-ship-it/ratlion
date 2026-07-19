"""Process AGA-INI logo: circular mask, remove white corners."""
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\syrga\.cursor\projects\c-Users-syrga-IdeaProjects-restaurant-order-service"
    r"\assets\c__Users_syrga_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
    r"_photo_5395601336629400799_y-71feb372-7de8-41e3-905c-3202fdf11893.png"
)
OUT = Path(__file__).resolve().parents[1] / "src/main/resources/static/restaurant/aga-ini/logo.png"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    cx, cy = w / 2, h / 2
    radius = min(w, h) / 2 * 0.985

    pixels = img.load()
    for y in range(h):
        for x in range(w):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy > radius * radius:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                r, g, b, a = pixels[x, y]
                # Corner bleed: only strip near-pure white outside the food ring
                dist = (dx * dx + dy * dy) ** 0.5
                if dist > radius * 0.88 and r > 248 and g > 248 and b > 248:
                    pixels[x, y] = (0, 0, 0, 0)

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    size = max(img.size)
    square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - img.size[0]) // 2
    oy = (size - img.size[1]) // 2
    square.paste(img, (ox, oy))

    out_size = 512
    square = square.resize((out_size, out_size), Image.Resampling.LANCZOS)
    square.save(OUT, "PNG")
    print("Saved", OUT, square.size)


if __name__ == "__main__":
    main()
