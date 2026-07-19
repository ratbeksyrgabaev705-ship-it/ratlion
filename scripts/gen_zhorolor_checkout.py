#!/usr/bin/env python3
"""Copy ORDO cart/receipt + fp-theme to ЖОРОЛОР (green colors)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
TPL = ROOT / "templates"
STATIC = ROOT / "static"

OC_CART = (TPL / "ordo-cafe-cart.html").read_text(encoding="utf-8")
OC_RECEIPT = (TPL / "ordo-cafe-receipt.html").read_text(encoding="utf-8")
OC_CSS = (STATIC / "ordo-cafe-customer.css").read_text(encoding="utf-8")
ZH_CSS_PATH = STATIC / "zhorolor-customer.css"
ZH_CSS = ZH_CSS_PATH.read_text(encoding="utf-8")

FP_START = "/* ===== Cart / checkout theme (fp- layout from family-customer.css) ===== */"
JOLCHU_START = "/* ── Жолчу success screen ── */"

COLOR_MAP = [
    ("oc-fp-theme", "zh-fp-theme"),
    ("#c9a227", "#2d6a4f"),
    ("#9a7b1a", "#1b4332"),
    ("#e8d48a", "#95d5b2"),
    ("#f3ead6", "#d8f3dc"),
    ("rgba(201, 162, 39, 0.2)", "rgba(45, 106, 79, 0.2)"),
    ("rgba(201, 162, 39, 0.35)", "rgba(45, 106, 79, 0.35)"),
    ("rgba(201, 162, 39, 0.28)", "rgba(45, 106, 79, 0.28)"),
    ("rgba(201, 162, 39, 0.4)", "rgba(45, 106, 79, 0.4)"),
]

ZH_FP_EXTRAS = """

body.zh-fp-theme {
    --fp-white: #ffffff;
    --fp-radius: 16px;
    --fp-radius-sm: 12px;
    --fp-max: 430px;
}

body.zh-fp-theme.fp-checkout-body,
body.zh-fp-theme.fp-cart-page {
    background: #fafaf5;
}

body.zh-fp-theme .fp-lang-pill {
    box-shadow: 0 3px 14px rgba(45, 106, 79, 0.2);
    border-color: #2d6a4f;
}

body.zh-fp-theme .fp-back,
body.zh-fp-theme .fp-subheader h1,
body.zh-fp-theme .fp-lang-pill .lang-opt.active {
    color: #2d6a4f;
}

body.zh-fp-theme .fp-step.done .fp-step-circle,
body.zh-fp-theme .fp-step.active .fp-step-circle {
    background: #2d6a4f;
    color: #fff;
}

body.zh-fp-theme .fp-step.done .fp-step-label,
body.zh-fp-theme .fp-step.active .fp-step-label {
    color: #1b4332;
}

body.zh-fp-theme .fp-mini-counter button:last-child {
    background: #2d6a4f;
    color: #fff;
}

body.zh-fp-theme .fp-cart-item strong,
body.zh-fp-theme .fp-total-row.grand span:last-child,
body.zh-fp-theme .fp-edit-link,
body.zh-fp-theme .fp-order-line-sum {
    color: #2d6a4f;
}

body.zh-fp-theme .fp-submit-btn,
body.zh-fp-theme .fp-checkout-btn {
    background: linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%);
    color: #fff;
    box-shadow: 0 6px 20px rgba(45, 106, 79, 0.28);
}

body.zh-fp-theme .fp-nav-item.active {
    color: #1b4332;
}

body.zh-fp-theme .fp-nav-badge {
    background: #2d6a4f;
    color: #fff;
}

body.zh-fp-theme .fp-cart-comment-input:focus {
    border-color: #2d6a4f;
    box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.2);
}
"""


def apply_colors(text: str) -> str:
    for old, new in COLOR_MAP:
        text = text.replace(old, new)
    return text


def html_for_zhorolor(text: str) -> str:
    text = text.replace("/ordo-cafe-customer.css", "/zhorolor-customer.css")
    text = text.replace("ordo-cafe-customer.css", "zhorolor-customer.css")
    text = text.replace("'ordo-cafe'", "'zhorolor'")
    text = text.replace('"/ordo-cafe"', '"/zhorolor"')
    text = text.replace("/ordo-cafe", "/zhorolor")
    text = text.replace("ОРДО КАФЕ", "ЖОРОЛОР САМСАСЫ")
    text = text.replace("oc-fp-theme", "zh-fp-theme")
    text = text.replace("CustomerI18n.t('bmHome')", "CustomerI18n.t('zhHome')")
    if "jolchu-success.css" not in text:
        text = text.replace(
            '<link rel="stylesheet" th:href="${customerCss}" href="/zhorolor-customer.css">',
            '<link rel="stylesheet" th:href="${customerCss}" href="/zhorolor-customer.css">\n    <link rel="stylesheet" href="/jolchu-success.css">',
        )
    text = text.replace("/jolchu/header.png?v=3", "/jolchu/header.png?v=4")
    return text


def extract_fp_theme_from_ordo() -> str:
    start = OC_CSS.index(FP_START)
    end = OC_CSS.index(JOLCHU_START) if JOLCHU_START in OC_CSS else len(OC_CSS)
    theme = OC_CSS[start:end].rstrip()
    theme = apply_colors(theme)
    jolchu = OC_CSS[end:].rstrip() if JOLCHU_START in OC_CSS else ""
    parts = [theme + ZH_FP_EXTRAS]
    if jolchu:
        parts.append(jolchu)
    return "\n\n".join(parts)


def scope_index_css(css: str) -> str:
    css = css.replace(
        "\n* { box-sizing: border-box; margin: 0; padding: 0; }",
        "\nbody:not(.zh-fp-theme) * { box-sizing: border-box; margin: 0; padding: 0; }",
        1,
    )
    css = css.replace(
        "\nbody.zh-body {",
        "\nbody.zh-body:not(.zh-fp-theme) {",
        1,
    )
    return css


def replace_fp_theme(css: str, fp_theme: str) -> str:
    if FP_START in css:
        s = css.index(FP_START)
        return css[:s].rstrip() + "\n\n" + fp_theme.strip() + "\n"
    return css.rstrip() + "\n\n" + fp_theme.strip() + "\n"


(TPL / "zhorolor-cart.html").write_text(html_for_zhorolor(OC_CART), encoding="utf-8")
(TPL / "zhorolor-receipt.html").write_text(html_for_zhorolor(OC_RECEIPT), encoding="utf-8")

fp_theme = extract_fp_theme_from_ordo()
new_css = scope_index_css(replace_fp_theme(ZH_CSS, fp_theme))
ZH_CSS_PATH.write_text(new_css, encoding="utf-8")

print("ЖОРОЛОР cart + receipt = ORDO copy (green theme)")
