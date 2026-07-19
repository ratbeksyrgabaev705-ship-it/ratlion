#!/usr/bin/env python3
"""Generate ORDO CAFE UI from AGA-INI templates (same layout, gold branding)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
STATIC = ROOT / "static"
TPL = ROOT / "templates"

AI_CSS = (STATIC / "aga-ini-customer.css").read_text(encoding="utf-8")
AI_IDX = (TPL / "aga-ini-index.html").read_text(encoding="utf-8")
AI_CART = (TPL / "aga-ini-cart.html").read_text(encoding="utf-8")
AI_RECEIPT = (TPL / "aga-ini-receipt.html").read_text(encoding="utf-8")

GOLD = "#c9a227"
GOLD_DARK = "#9a7b1a"
GOLD_LIGHT = "#f3ead6"
HERO_BG = "/restaurant/ordo-cafe/hero-bg.jpg"


def css_for_ordo(text: str) -> str:
    repl = {
        "#ff5a00": GOLD,
        "#FF5A00": GOLD,
        "#ff5400": GOLD_DARK,
        "#e94b00": GOLD_DARK,
        "#fff3ec": GOLD_LIGHT,
        "#b34700": GOLD_DARK,
        "#ff6500": GOLD,
        "#ff3b00": GOLD_DARK,
        "rgba(255, 90, 0,": "rgba(201, 162, 39,",
        "photo-1515003197210-e0cd71810b5f": HERO_BG,
    }
    for old, new in repl.items():
        text = text.replace(old, new)
    return "/* ОРДО КАФЕ — AGA-INI layout + gold theme */\n" + text


def html_for_ordo(text: str) -> str:
    text = text.replace("/aga-ini-customer.css", "/ordo-cafe-customer.css")
    text = text.replace("aga-ini-customer.css", "ordo-cafe-customer.css")
    text = text.replace("'aga-ini'", "'ordo-cafe'")
    text = text.replace('"/aga-ini"', '"/ordo-cafe"')
    text = text.replace("/aga-ini", "/ordo-cafe")
    text = text.replace("/restaurant/aga-ini/", "/restaurant/ordo-cafe/")
    text = text.replace("АГА-ИНИ", "ОРДО КАФЕ")
    text = text.replace("ага-ини", "ordo-cafe")
    text = text.replace("Aga-Ini", "Ordo Cafe")
    return text


(STATIC / "ordo-cafe-customer.css").write_text(css_for_ordo(AI_CSS), encoding="utf-8")
(TPL / "ordo-cafe-index.html").write_text(html_for_ordo(AI_IDX), encoding="utf-8")
(TPL / "ordo-cafe-cart.html").write_text(html_for_ordo(AI_CART), encoding="utf-8")
(TPL / "ordo-cafe-receipt.html").write_text(html_for_ordo(AI_RECEIPT), encoding="utf-8")
AI_ITEM = (TPL / "aga-ini-item.html").read_text(encoding="utf-8")
(TPL / "ordo-cafe-item.html").write_text(html_for_ordo(AI_ITEM), encoding="utf-8")

print("Generated ORDO from AGA-INI (gold theme)")
