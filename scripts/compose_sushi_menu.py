"""Compose menu photo: crop sushi from screenshot, place on black plate with background."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ASSETS = Path(r"C:\Users\syrga\.cursor\projects\c-Users-syrga-IdeaProjects-restaurant-order-service\assets")
OUT_DIR = Path(r"C:\Users\syrga\IdeaProjects\restaurant-order-service\assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Crop box for sushi photo inside Yandex viewer (1024x640 screenshot)
EEL_CROP = (129, 112, 657, 597)


def remove_white_bg(img: Image.Image, threshold: int = 238) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > threshold and g > threshold and b > threshold:
                px[x, y] = (255, 255, 255, 0)
    return img


def make_wood_background(ref_bg: Image.Image, size: tuple[int, int]) -> Image.Image:
    bg = ref_bg.convert("RGB").resize(size, Image.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(6))
    return ImageEnhance.Brightness(bg).enhance(0.95)


def draw_black_plate(canvas: Image.Image, cx: int, cy: int, rx: int, ry: int) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((cx - rx - 8, cy - ry + 10, cx + rx + 8, cy + ry + 22), fill=(20, 15, 10))
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(18, 18, 20))
    draw.ellipse((cx - rx + 6, cy - ry + 6, cx + rx - 6, cy + ry - 6), outline=(45, 45, 48), width=2)


def compose(screenshot_path: Path, bg_path: Path, out_path: Path, crop_box: tuple[int, int, int, int]) -> None:
    sushi_crop = Image.open(screenshot_path).convert("RGB").crop(crop_box)
    sushi = remove_white_bg(sushi_crop)

    bbox = sushi.getbbox()
    if bbox:
        sushi = sushi.crop(bbox)

    out_w, out_h = 1200, 900
    canvas = make_wood_background(Image.open(bg_path), (out_w, out_h))

    plate_cx, plate_cy = out_w // 2, out_h // 2 + 30
    draw_black_plate(canvas, plate_cx, plate_cy, 340, 240)

    max_w, max_h = 560, 360
    sw, sh = sushi.size
    scale = min(max_w / sw, max_h / sh)
    new_size = (int(sw * scale), int(sh * scale))
    sushi_resized = sushi.resize(new_size, Image.LANCZOS)

    paste_x = plate_cx - new_size[0] // 2
    paste_y = plate_cy - new_size[1] // 2 - 10
    canvas.paste(sushi_resized, (paste_x, paste_y), sushi_resized)

    canvas.save(out_path, "PNG", optimize=True)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    compose(
        ASSETS / "c__Users_syrga_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-c1648527-c7fa-4b95-802f-90129bb142ee.png",
        ASSETS / "baked-philadelphia-final.png",
        OUT_DIR / "baked-eel-roll-composed.png",
        EEL_CROP,
    )
