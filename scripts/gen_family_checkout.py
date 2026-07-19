#!/usr/bin/env python3
"""Copy ORDO cart/receipt to FEMILY (family-customer.css burgundy theme)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
TPL = ROOT / "templates"
STATIC = ROOT / "static"

OC_CART = (TPL / "ordo-cafe-cart.html").read_text(encoding="utf-8")
OC_RECEIPT = (TPL / "ordo-cafe-receipt.html").read_text(encoding="utf-8")
OC_CSS = (STATIC / "ordo-cafe-customer.css").read_text(encoding="utf-8")
FM_CSS_PATH = STATIC / "family-customer.css"
FM_CSS = FM_CSS_PATH.read_text(encoding="utf-8")

CART_COMMENT_START = ".fp-cart-comment {"
JOLCHU_START = "/* ── Жолчу success screen ── */"


def html_for_family(text: str) -> str:
    text = text.replace("/ordo-cafe-customer.css", "/family-customer.css")
    text = text.replace("ordo-cafe-customer.css", "family-customer.css")
    text = text.replace("'ordo-cafe'", "'family'")
    text = text.replace('"/ordo-cafe"', '"/family"')
    text = text.replace("/ordo-cafe", "/family")
    text = text.replace("ОРДО КАФЕ", "FEMILY")
    text = text.replace(" oc-fp-theme", "")
    text = text.replace(
        '<link rel="stylesheet" href="/family-customer.css">\n    '
        '<link rel="stylesheet" th:href="${customerCss}" href="/family-customer.css">',
        '<link rel="stylesheet" th:href="${customerCss}" href="/family-customer.css">',
    )
    text = text.replace(
        "id: /*[[${restaurantId}]]*/ 3,",
        "id: /*[[${restaurantId}]]*/ 2,",
    )
    text = text.replace("CustomerI18n.t('bmHome')", "CustomerI18n.t('home')")
    return text


def extract_checkout_extras() -> str:
    """Cart comment + Jolchu CSS from ORDO, burgundy focus for FEMILY."""
    comment_start = OC_CSS.index(CART_COMMENT_START)
    jolchu_start = OC_CSS.index(JOLCHU_START)
    block = OC_CSS[comment_start:jolchu_start] + OC_CSS[jolchu_start:]
    block = block.replace("#c9a227", "var(--fp-burgundy)")
    block = block.replace("rgba(201, 162, 39, 0.2)", "rgba(92, 26, 26, 0.2)")
    return "\n\n/* ===== Cart comment + Jolchu (from ORDO checkout) ===== */\n" + block.strip() + "\n"


def append_extras(css: str) -> str:
    marker = "/* ===== Cart comment + Jolchu"
    if marker in css:
        start = css.index(marker)
        css = css[:start].rstrip() + "\n"
    if CART_COMMENT_START not in css:
        css = css.rstrip() + extract_checkout_extras()
    return css


(TPL / "family-cart.html").write_text(html_for_family(OC_CART), encoding="utf-8")
(TPL / "family-receipt.html").write_text(html_for_family(OC_RECEIPT), encoding="utf-8")
FM_CSS_PATH.write_text(append_extras(FM_CSS), encoding="utf-8")

print("FEMILY cart + receipt = ORDO copy (burgundy theme)")
