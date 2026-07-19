#!/usr/bin/env python3
"""Remove legacy embedded cart/receipt CSS from aga-ini-customer.css."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "src" / "main" / "resources" / "static" / "aga-ini-customer.css"

text = CSS.read_text(encoding="utf-8")
start_marker = "/* === cart.html === */"
end_marker = "/* ===== Cart / checkout theme"
start = text.index(start_marker)
end = text.index(end_marker)
CSS.write_text(text[:start] + text[end:], encoding="utf-8")
print(f"Removed {end - start} chars of legacy CSS")
