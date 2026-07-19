#!/usr/bin/env python3
"""Copy ORDO Wolt/Glovo menu (index + CSS + item) to ЖОРОЛОР — green theme."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
TPL = ROOT / "templates"
STATIC = ROOT / "static"

OC_INDEX = (TPL / "ordo-cafe-index.html").read_text(encoding="utf-8")
OC_ITEM = (TPL / "ordo-cafe-item.html").read_text(encoding="utf-8")
OC_CSS = (STATIC / "ordo-cafe-customer.css").read_text(encoding="utf-8")

CART_MARKER = "/* === cart.html === */"

COLOR_MAP = [
    ("#c9a227", "#2d6a4f"),
    ("#9a7b1a", "#1b4332"),
    ("#f3ead6", "#d8f3dc"),
    ("#e8d48a", "#95d5b2"),
    ("#fffdf9", "#fafaf5"),
    ("rgba(201, 162, 39,", "rgba(45, 106, 79,"),
    ("201, 162, 39", "45, 106, 79"),
]


def apply_colors(text: str) -> str:
    for old, new in COLOR_MAP:
        text = text.replace(old, new)
    return text


def html_for_zhorolor(text: str) -> str:
    text = text.replace("/ordo-cafe-customer.css", "/zhorolor-customer.css?v=8")
    text = text.replace("ordo-cafe-customer.css", "zhorolor-customer.css?v=8")
    text = text.replace("'ordo-cafe'", "'zhorolor'")
    text = text.replace('"/ordo-cafe"', '"/zhorolor"')
    text = text.replace("/restaurant/ordo-cafe/", "/restaurant/zhorolor/")
    text = text.replace("/ordo-cafe", "/zhorolor")
    text = text.replace("ОРДО КАФЕ", "ЖОРОЛОР САМСАСЫ")
    text = text.replace('alt="ordo-cafe"', 'alt="zhorolor"')
    text = text.replace("restaurantEmoji : 'OC'}", "restaurantEmoji : '🥟'}")
    text = text.replace(">🥘 Улуттук ашкана<", ">🥟 Бышкан самса<")
    text = text.replace(
        "'/restaurant/zhorolor/hero-bg.jpg'",
        "'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'",
    )
    text = text.replace(
        "badgeCuisine: '🥘 Улуттук ашкана'",
        "badgeCuisine: '🥟 Бышкан самса'",
    )
    text = text.replace(
        "badgeCuisine: '🥘 Национальная кухня'",
        "badgeCuisine: '\U0001f95f \u0421\u0432\u0435\u0436\u0430\u044f \u0441\u0430\u043c\u0441\u0430'",
    )
    text = text.replace(
        "badgeDelivery: '🚚 20–40 мин'",
        "badgeDelivery: '🚚 20–30 мин'",
    )
    return text


def menu_css_from_ordo() -> str:
    menu = OC_CSS[: OC_CSS.index(CART_MARKER)].rstrip()
    menu = apply_colors(menu)
    return menu.replace(
        "/* ОРДО КАФЕ — Wolt/Glovo modern UI */",
        "/* ЖОРОЛОР САМСАСЫ — Wolt/Glovo UI (from ORDO, green theme) */",
        1,
    )


if __name__ == "__main__":
    (TPL / "zhorolor-index.html").write_text(html_for_zhorolor(OC_INDEX), encoding="utf-8")
    (TPL / "zhorolor-item.html").write_text(html_for_zhorolor(OC_ITEM), encoding="utf-8")

    existing = (STATIC / "zhorolor-customer.css").read_text(encoding="utf-8")
    fp_start = "/* ===== Cart / checkout theme (fp- layout from family-customer.css) ===== */"
    checkout = existing[existing.index(fp_start) :] if fp_start in existing else ""

    (STATIC / "zhorolor-customer.css").write_text(
        menu_css_from_ordo() + "\n\n" + checkout.lstrip(),
        encoding="utf-8",
    )
    print("ЖОРОЛОР menu = ORDO Wolt/Glovo copy (green theme)")
