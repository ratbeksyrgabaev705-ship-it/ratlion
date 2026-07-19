#!/usr/bin/env python3
"""Copy ORDO cart/receipt + fp-theme to AGA-INI (orange colors only)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
TPL = ROOT / "templates"
STATIC = ROOT / "static"

OC_CART = (TPL / "ordo-cafe-cart.html").read_text(encoding="utf-8")
OC_RECEIPT = (TPL / "ordo-cafe-receipt.html").read_text(encoding="utf-8")
OC_CSS = (STATIC / "ordo-cafe-customer.css").read_text(encoding="utf-8")
AI_CSS_PATH = STATIC / "aga-ini-customer.css"
AI_CSS = AI_CSS_PATH.read_text(encoding="utf-8")

FP_START = "/* ===== Cart / checkout theme (fp- layout from family-customer.css) ===== */"

COLOR_MAP = [
    ("oc-fp-theme", "ai-fp-theme"),
    ("#c9a227", "#ff5a00"),
    ("#9a7b1a", "#e94b00"),
    ("#e8d48a", "#ffb380"),
    ("#f3ead6", "#fff3ec"),
    ("rgba(201, 162, 39, 0.2)", "rgba(255, 90, 0, 0.2)"),
    ("rgba(201, 162, 39, 0.35)", "rgba(255, 90, 0, 0.35)"),
    ("rgba(201, 162, 39, 0.28)", "rgba(255, 90, 0, 0.28)"),
    ("rgba(201, 162, 39, 0.4)", "rgba(255, 90, 0, 0.4)"),
]


def apply_colors(text: str) -> str:
    for old, new in COLOR_MAP:
        text = text.replace(old, new)
    return text


def html_for_aga(text: str) -> str:
    text = text.replace("/ordo-cafe-customer.css", "/aga-ini-customer.css")
    text = text.replace("ordo-cafe-customer.css", "aga-ini-customer.css")
    text = text.replace("'ordo-cafe'", "'aga-ini'")
    text = text.replace('"/ordo-cafe"', '"/aga-ini"')
    text = text.replace("/ordo-cafe", "/aga-ini")
    text = text.replace("ОРДО КАФЕ", "АГА-ИНИ")
    text = text.replace("oc-fp-theme", "ai-fp-theme")
    text = text.replace(
        "photo-1569718212165-3a8278d5f624?w=200&q=80",
        "photo-1515003197210-e0cd71810b5f?w=200&q=80",
    )
    return text


def extract_fp_theme_from_ordo() -> str:
    start = OC_CSS.index(FP_START)
    return apply_colors(OC_CSS[start:])


def scope_index_css(css: str) -> str:
    """Keep menu styles off checkout pages (body.ai-fp-theme)."""
    css = css.replace(
        "\n* {\n            margin: 0;\n            padding: 0;\n            box-sizing: border-box;\n            font-family: Arial, sans-serif;\n        }",
        "\nbody:not(.ai-fp-theme) * {\n            margin: 0;\n            padding: 0;\n            box-sizing: border-box;\n            font-family: Arial, sans-serif;\n        }",
        1,
    )
    css = css.replace(
        "\n        body {\n            background: var(--background);\n            color: var(--dark);\n            padding-bottom: 95px;\n        }",
        "\n        body:not(.ai-fp-theme) {\n            background: var(--background);\n            color: var(--dark);\n            padding-bottom: 95px;\n        }",
        1,
    )
    return css


def replace_fp_theme(css: str, fp_theme: str) -> str:
    legacy_start = "/* === cart.html === */"
    if legacy_start in css:
        s = css.index(legacy_start)
        e = css.index(FP_START)
        css = css[:s] + css[e:]

    extra = "/* ===== AGA-INI fp-checkout: force orange"
    if extra in css:
        css = css[: css.index(extra)].rstrip() + "\n"

    if FP_START in css:
        s = css.index(FP_START)
        return css[:s].rstrip() + "\n\n" + fp_theme.strip() + "\n"
    return css.rstrip() + "\n\n" + fp_theme.strip() + "\n"


(TPL / "aga-ini-cart.html").write_text(html_for_aga(OC_CART), encoding="utf-8")
(TPL / "aga-ini-receipt.html").write_text(html_for_aga(OC_RECEIPT), encoding="utf-8")

fp_theme = extract_fp_theme_from_ordo()
new_css = scope_index_css(replace_fp_theme(AI_CSS, fp_theme))
AI_CSS_PATH.write_text(new_css, encoding="utf-8")

print("AGA-INI cart + receipt = ORDO copy (orange theme)")
