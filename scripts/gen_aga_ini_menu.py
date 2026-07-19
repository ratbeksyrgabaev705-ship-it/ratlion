#!/usr/bin/env python3
"""Copy ORDO Wolt/Glovo menu (index + CSS + item) to АГА-ИНИ — orange theme."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
TPL = ROOT / "templates"
STATIC = ROOT / "static"

OC_INDEX = (TPL / "ordo-cafe-index.html").read_text(encoding="utf-8")
OC_ITEM = (TPL / "ordo-cafe-item.html").read_text(encoding="utf-8")
OC_CSS = (STATIC / "ordo-cafe-customer.css").read_text(encoding="utf-8")

CART_MARKER = "/* === cart.html === */"

COLOR_MAP = [
    ("#c9a227", "#ff5a00"),
    ("#9a7b1a", "#e94b00"),
    ("#f3ead6", "#fff3ec"),
    ("#e8d48a", "#ffb380"),
    ("#fffdf9", "#fffaf7"),
    ("rgba(201, 162, 39,", "rgba(255, 90, 0,"),
    ("201, 162, 39", "255, 90, 0"),
]


def apply_colors(text: str) -> str:
    for old, new in COLOR_MAP:
        text = text.replace(old, new)
    return text


def html_for_aga_ini(text: str) -> str:
    text = text.replace("/ordo-cafe-customer.css", "/aga-ini-customer.css?v=2")
    text = text.replace("ordo-cafe-customer.css", "aga-ini-customer.css?v=2")
    text = text.replace("'ordo-cafe'", "'aga-ini'")
    text = text.replace('"/ordo-cafe"', '"/aga-ini"')
    text = text.replace("/restaurant/ordo-cafe/", "/restaurant/aga-ini/")
    text = text.replace("/ordo-cafe", "/aga-ini")
    text = text.replace("ОРДО КАФЕ", "АГА-ИНИ")
    text = text.replace('alt="ordo-cafe"', 'alt="aga-ini"')
    text = text.replace("restaurantEmoji : 'OC'}", "restaurantEmoji : 'AI'}")
    text = text.replace(">OC<", ">AI<")
    text = text.replace(
        "'/restaurant/aga-ini/hero-bg.jpg'",
        "'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&q=80'",
    )
    text = text.replace(
        "badgeCuisine: '🥘 Улуттук ашкана'",
        "badgeCuisine: '🍣 Суши · Пицца · Бургер'",
    )
    text = text.replace(
        "badgeCuisine: '🥘 Национальная кухня'",
        "badgeCuisine: '🍣 Суши · Пицца · Бургер'",
    )
    text = text.replace(
        "badgeDelivery: '🚚 20–40 мин'",
        "badgeDelivery: '🚚 25–45 мин'",
    )
    return text


def menu_css_from_ordo() -> str:
    menu = OC_CSS[: OC_CSS.index(CART_MARKER)].rstrip()
    menu = apply_colors(menu)
    return menu.replace(
        "/* ОРДО КАФЕ — Wolt/Glovo modern UI */",
        "/* АГА-ИНИ — Wolt/Glovo UI (from ORDO, orange theme) */",
        1,
    )


if __name__ == "__main__":
    (TPL / "aga-ini-index.html").write_text(html_for_aga_ini(OC_INDEX), encoding="utf-8")
    (TPL / "aga-ini-item.html").write_text(html_for_aga_ini(OC_ITEM), encoding="utf-8")

    existing = (STATIC / "aga-ini-customer.css").read_text(encoding="utf-8")
    fp_start = "/* ===== Cart / checkout theme (fp- layout from family-customer.css) ===== */"
    checkout = existing[existing.index(fp_start) :] if fp_start in existing else ""

    (STATIC / "aga-ini-customer.css").write_text(
        menu_css_from_ordo() + "\n\n" + checkout.lstrip(),
        encoding="utf-8",
    )
    print("АГА-ИНИ menu = ORDO Wolt/Glovo copy (orange theme)")
