#!/usr/bin/env python3
"""Generate AGA-INI item page from ORDO item template."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources" / "templates"
src = (ROOT / "ordo-cafe-item.html").read_text(encoding="utf-8")

replacements = [
    ("/ordo-cafe-customer.css", "/aga-ini-customer.css"),
    ("ordo-cafe-customer.css", "aga-ini-customer.css"),
    ("'ordo-cafe'", "'aga-ini'"),
    ("'/ordo-cafe'", "'/aga-ini'"),
    ("/ordo-cafe", "/aga-ini"),
    ("ОРДО КАФЕ", "АГА-ИНИ"),
    ("/restaurant/ordo-cafe/hero-bg.jpg", "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&q=80"),
    ("/restaurant/ordo-cafe/logo.png", "/restaurant/aga-ini/logo.png"),
    ("--item-gold: #c9a227", "--item-gold: #ff5a00"),
    ("--gold-pale: #f3ead6", "--gold-pale: #fff3ec"),
    ("--item-bg: #fffdf9", "--item-bg: #ffffff"),
    ("#c9a227", "#ff5a00"),
    ("#9a7b1a", "#e94b00"),
    ("#2e9e4a", "#ff5a00"),
    ("#1f7a38", "#e94b00"),
]

out = src
for old, new in replacements:
    out = out.replace(old, new)

(ROOT / "aga-ini-item.html").write_text(out, encoding="utf-8")
print("Generated aga-ini-item.html")
