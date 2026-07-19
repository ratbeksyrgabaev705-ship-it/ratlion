#!/usr/bin/env python3
"""Generate ORDO cart/receipt from BURGERMAN (FEMILY fp- checkout)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
TPL = ROOT / "templates"
STATIC = ROOT / "static"

BM_CART = (TPL / "burger-men-cart.html").read_text(encoding="utf-8")
BM_RECEIPT = (TPL / "burger-men-receipt.html").read_text(encoding="utf-8")
OC_CSS = (STATIC / "ordo-cafe-customer.css").read_text(encoding="utf-8")


def html_for_ordo(text: str) -> str:
    text = text.replace("/burger-men-customer.css", "/ordo-cafe-customer.css")
    text = text.replace("burger-men-customer.css", "ordo-cafe-customer.css")
    text = text.replace("'burger-men'", "'ordo-cafe'")
    text = text.replace('"/burger-men"', '"/ordo-cafe"')
    text = text.replace("/burger-men", "/ordo-cafe")
    text = text.replace("BURGERMAN", "ОРДО КАФЕ")
    text = text.replace("bm-fp-theme", "oc-fp-theme")
    text = text.replace(
        "photo-1568901346375-23c9450c58cd?w=200&q=80",
        "photo-1569718212165-3a8278d5f624?w=200&q=80",
    )
    return text


FP_THEME = """

/* ===== Cart / checkout theme (fp- layout from family-customer.css) ===== */
body.oc-fp-theme {
    --fp-burgundy: #c9a227;
    --fp-burgundy-dark: #9a7b1a;
    --fp-burgundy-light: #e8d48a;
    --fp-gold: #c9a227;
    --fp-bg: #f7f7f7;
    --fp-cream: #ffffff;
    --fp-text: #0a0a0a;
    --fp-muted: #6b6b6b;
    --fp-line: #ececec;
    --fp-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

body.oc-fp-theme .fp-submit-btn,
body.oc-fp-theme .fp-checkout-btn {
    background: linear-gradient(135deg, #c9a227 0%, #9a7b1a 100%);
    color: #fff;
}

body.oc-fp-theme .fp-nav-item.active {
    color: #9a7b1a;
}

body.oc-fp-theme .fp-mini-counter {
    border-color: #c9a227;
    background: #f3ead6;
}

body.oc-fp-theme .fp-pay-check {
    background: #c9a227;
    color: #fff;
}

body.oc-fp-theme .fp-bank-box {
    background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
    color: #fff;
}

body.oc-fp-theme .fp-bank-box .num {
    color: #fff;
}

body.oc-fp-theme .fp-bank-sum {
    color: #e8d48a;
    font-weight: 900;
}

body.oc-fp-theme .fp-upload label {
    background: linear-gradient(135deg, #c9a227, #9a7b1a);
    color: #fff;
}

body.oc-fp-theme .fp-success-icon {
    background: #f3ead6;
    color: #9a7b1a;
}

body.oc-fp-theme .fp-order-info-text strong {
    color: #9a7b1a;
}

body.oc-fp-theme .fp-section-icon-round {
    background: #f3ead6;
    color: #9a7b1a;
}
"""

(TPL / "ordo-cafe-cart.html").write_text(html_for_ordo(BM_CART), encoding="utf-8")
(TPL / "ordo-cafe-receipt.html").write_text(html_for_ordo(BM_RECEIPT), encoding="utf-8")

if "body.oc-fp-theme" not in OC_CSS:
    (STATIC / "ordo-cafe-customer.css").write_text(OC_CSS.rstrip() + FP_THEME, encoding="utf-8")

print("Generated ORDO cart + receipt (FEMILY checkout flow)")
