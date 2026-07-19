#!/usr/bin/env python3
"""Generate ORDO + ZHOROLOR modern UI from BURGERMAN templates."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
STATIC = ROOT / "static"
TPL = ROOT / "templates"

BM_CSS = (STATIC / "burger-men-customer.css").read_text(encoding="utf-8")
BM_IDX = (TPL / "burger-men-index.html").read_text(encoding="utf-8")
BM_CART = (TPL / "burger-men-cart.html").read_text(encoding="utf-8")
BM_RECEIPT = (TPL / "burger-men-receipt.html").read_text(encoding="utf-8")


def css_for(prefix: str, replacements: dict[str, str]) -> str:
    text = BM_CSS.replace("bm-", f"{prefix}-").replace("--bm-", f"--{prefix}-")
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def html_common(text: str, prefix: str, slug: str, name: str, i18n: str) -> str:
    text = text.replace("/burger-men-customer.css", f"/{slug}-customer.css")
    text = text.replace("burger-men-customer.css", f"{slug}-customer.css")
    text = text.replace("'burger-men'", f"'{slug}'")
    text = text.replace('"/burger-men"', f'"/{slug}"')
    text = text.replace("/burger-men", f"/{slug}")
    text = text.replace("BURGERMAN", name)
    text = text.replace("bm-body", f"{prefix}-body")
    text = text.replace("bm-fp-theme", f"{prefix}-fp-theme")
    text = text.replace("bm-", f"{prefix}-")
    text = text.replace("CustomerI18n.t('bm", f"CustomerI18n.t('{i18n}")
    return text


ORDO_CSS_REPL = {
    "#ffc107": "#c9a227",
    "#f5a800": "#9a7b1a",
    "#e31837": "#9a7b1a",
    "#f7f7f7": "#f5f0e6",
    "#fff8e1": "#f3ead6",
    "rgba(255, 193, 7,": "rgba(201, 162, 39,",
}

ZH_CSS_REPL = {
    "#ffc107": "#2d6a4f",
    "#f5a800": "#1b4332",
    "#e31837": "#1b4332",
    "#f7f7f7": "#fafaf5",
    "#fff8e1": "#d8f3dc",
    "rgba(255, 193, 7,": "rgba(45, 106, 79,",
}


def scope_zh_index_css(css: str) -> str:
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
    css = css.replace(
        ".zh-add-btn {\n    width: 34px;\n    height: 34px;\n    border-radius: 10px;\n    background: var(--zh-yellow);\n    color: var(--zh-text);",
        ".zh-add-btn {\n    width: 34px;\n    height: 34px;\n    border-radius: 10px;\n    background: var(--zh-yellow);\n    color: #fff;",
        1,
    )
    css = css.replace(
        ".zh-sheet-counter .zh-qty-plus {\n    color: var(--zh-text);\n    background: var(--zh-yellow);",
        ".zh-sheet-counter .zh-qty-plus {\n    color: #fff;\n    background: var(--zh-yellow);",
        1,
    )
    css = css.replace(
        ".zh-sheet-add {\n    width: 100%;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 17px 22px;\n    border-radius: 18px;\n    background: linear-gradient(135deg, var(--zh-yellow) 0%, var(--zh-yellow-dark) 100%);\n    color: var(--zh-text);",
        ".zh-sheet-add {\n    width: 100%;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 17px 22px;\n    border-radius: 18px;\n    background: linear-gradient(135deg, var(--zh-yellow) 0%, var(--zh-yellow-dark) 100%);\n    color: #fff;",
        1,
    )
    return css

ORDO_INDEX = html_common(BM_IDX, "oc", "ordo-cafe", "ОРДО", "oc")
ORDO_INDEX = ORDO_INDEX.replace(
    """        <div class="oc-brand">
            <span class="oc-brand-icon">🍔</span>
            <div>
                <div class="oc-brand-title">
                    <span class="oc-burger">BURGER</span><span class="oc-man">MAN</span>
                </div>
                <div class="oc-brand-sub">BURGER HOUSE</div>
            </div>
        </div>""",
    """        <div class="oc-brand">
            <span class="oc-brand-icon">🍽</span>
            <div>
                <div class="oc-brand-title">
                    <span class="oc-burger">ОР</span><span class="oc-man">ДО</span>
                </div>
                <div class="oc-brand-sub">CHAIKHANA · CAFE</div>
            </div>
        </div>""",
)
ORDO_INDEX = ORDO_INDEX.replace(
    'src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80"',
    'src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80"',
)
ORDO_INDEX = ORDO_INDEX.replace("let selectedCat = 'burgers';", "let selectedCat = 'lagman';")
ORDO_INDEX = ORDO_INDEX.replace(
    """    const CAT_DEFS = [
        { key: 'all', i18n: 'catAll', match: () => true, icon: '🍽' },
        { key: 'burgers', i18n: 'catBurgers', match: c => /бургер|burger/i.test(c), icon: '🍔' },
        { key: 'combo', i18n: 'catCombo', match: c => /комбо|combo/i.test(c), icon: '🍟' },
        { key: 'shawarma', i18n: 'catShawarma', match: c => /шаурма|shaver/i.test(c), icon: '🌯' },
        { key: 'snacks', i18n: 'catSnacks', match: c => /снэк|закуск|картош|наггет|snack|fries/i.test(c), icon: '🍗' },
        { key: 'drinks', i18n: 'catDrinks', match: c => /суусундук|напит|cola|кола|drink/i.test(c), icon: '🥤' },
        { key: 'sauces', i18n: 'catSauces', match: c => /соус|sauce/i.test(c), icon: '🫙' }
    ];""",
    """    const CAT_DEFS = [
        { key: 'all', i18n: 'catAll', match: () => true, icon: '🍽' },
        { key: 'lagman', i18n: 'ocCatLagman', match: c => /лагман|ganfan|ганфан/i.test(c), icon: '🍜' },
        { key: 'plov', i18n: 'ocCatPlov', match: c => /плов/i.test(c), icon: '🍚' },
        { key: 'samsa', i18n: 'ocCatSamsa', match: c => /самса/i.test(c), icon: '🥟' },
        { key: 'shorpo', i18n: 'ocCatShorpo', match: c => /шорп/i.test(c), icon: '🍲' },
        { key: 'national', i18n: 'ocCatNational', match: c => /улуттук|национ/i.test(c), icon: '🥘' },
        { key: 'drinks', i18n: 'ocCatDrinks', match: c => /ичимдик|напит|чай|айран/i.test(c), icon: '🍵' }
    ];""",
)
ORDO_INDEX = ORDO_INDEX.replace("isComboItem", "isNationalItem")
ORDO_INDEX = ORDO_INDEX.replace("itemMatchesCat(item, 'combo')", "itemMatchesCat(item, 'national')")
ORDO_INDEX = ORDO_INDEX.replace("CustomerI18n.t('ocCombo')", "CustomerI18n.t('ocNational')")
ORDO_INDEX = ORDO_INDEX.replace("'ocHome'", "'ocHome'")
ORDO_INDEX = ORDO_INDEX.replace("CustomerI18n.t('ocPromoTitle')", "CustomerI18n.t('ocPromoTitle')")
ORDO_INDEX = ORDO_INDEX.replace(
    "'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80'",
    "'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80'",
)
ORDO_INDEX = ORDO_INDEX.replace("🍔</div>'", "🍜</div>'")
ORDO_INDEX = ORDO_INDEX.replace("🍔</div>`", "🍜</div>`")
ORDO_INDEX = ORDO_INDEX.replace("🍟</div>`", "🥘</div>`")

ZH_INDEX = html_common(BM_IDX, "zh", "zhorolor", "ЖОРОЛОР", "zh")
ZH_INDEX = ZH_INDEX.replace(
    """        <div class="zh-brand">
            <span class="zh-brand-icon">🍔</span>
            <div>
                <div class="zh-brand-title">
                    <span class="zh-burger">BURGER</span><span class="zh-man">MAN</span>
                </div>
                <div class="zh-brand-sub">BURGER HOUSE</div>
            </div>
        </div>""",
    """        <div class="zh-brand">
            <span class="zh-brand-icon">🥟</span>
            <div>
                <div class="zh-brand-title">
                    <span class="zh-burger">ЖОРО</span><span class="zh-man">ЛОР</span>
                </div>
                <div class="zh-brand-sub">САМСАСЫ · BAKERY</div>
            </div>
        </div>""",
)
ZH_INDEX = ZH_INDEX.replace(
    'src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80"',
    'src="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"',
)
ZH_INDEX = ZH_INDEX.replace("let selectedCat = 'burgers';", "let selectedCat = 'samsa';")
ZH_INDEX = ZH_INDEX.replace(
    """    const CAT_DEFS = [
        { key: 'all', i18n: 'catAll', match: () => true, icon: '🍽' },
        { key: 'burgers', i18n: 'catBurgers', match: c => /бургер|burger/i.test(c), icon: '🍔' },
        { key: 'combo', i18n: 'catCombo', match: c => /комбо|combo/i.test(c), icon: '🍟' },
        { key: 'shawarma', i18n: 'catShawarma', match: c => /шаурма|shaver/i.test(c), icon: '🌯' },
        { key: 'snacks', i18n: 'catSnacks', match: c => /снэк|закуск|картош|наггет|snack|fries/i.test(c), icon: '🍗' },
        { key: 'drinks', i18n: 'catDrinks', match: c => /суусундук|напит|cola|кола|drink/i.test(c), icon: '🥤' },
        { key: 'sauces', i18n: 'catSauces', match: c => /соус|sauce/i.test(c), icon: '🫙' }
    ];""",
    """    const CAT_DEFS = [
        { key: 'all', i18n: 'catAll', match: () => true, icon: '🍽' },
        { key: 'samsa', i18n: 'zhCatSamsa', match: c => /самса/i.test(c), icon: '🥟' },
        { key: 'bakery', i18n: 'zhCatBakery', match: c => /выпеч|бörek|булоч|лепёш|нан/i.test(c), icon: '🥐' },
        { key: 'hot', i18n: 'zhCatHot', match: c => /ысык|горяч/i.test(c), icon: '🔥' },
        { key: 'drinks', i18n: 'zhCatDrinks', match: c => /ичимдик|напит|чай|суусундук/i.test(c), icon: '🍵' }
    ];""",
)
ZH_INDEX = ZH_INDEX.replace("isComboItem(item)", "isHotItem(item)")
ZH_INDEX = ZH_INDEX.replace("!isComboItem(i)", "!isHotItem(i)")
ZH_INDEX = ZH_INDEX.replace("isComboItem(i)", "isHotItem(i)")
ZH_INDEX = ZH_INDEX.replace("itemMatchesCat(item, 'combo')", "itemMatchesCat(item, 'hot')")
ZH_INDEX = ZH_INDEX.replace("CustomerI18n.t('zhCombo')", "CustomerI18n.t('zhHot')")
ZH_INDEX = ZH_INDEX.replace(
    "'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80'",
    "'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'",
)
ZH_INDEX = ZH_INDEX.replace("🍔</div>'", "🥟</div>'")
ZH_INDEX = ZH_INDEX.replace("🍔</div>`", "🥟</div>`")
ZH_INDEX = ZH_INDEX.replace("🍟</div>`", "🔥</div>`")
ZH_INDEX = ZH_INDEX.replace(
    'href="/zhorolor-customer.css"',
    'href="/zhorolor-customer.css?v=6"',
)

ORDO_CART = html_common(BM_CART, "oc", "ordo-cafe", "ОРДО", "oc")
ORDO_RECEIPT = html_common(BM_RECEIPT, "oc", "ordo-cafe", "ОРДО", "oc")
ZH_CART = html_common(BM_CART, "zh", "zhorolor", "ЖОРОЛОР", "zh")
ZH_RECEIPT = html_common(BM_RECEIPT, "zh", "zhorolor", "ЖОРОЛОР", "zh")

# ORDO is restored from git + scripts/restore_ordo_menu.py — do NOT overwrite here.
(STATIC / "zhorolor-customer.css").write_text(scope_zh_index_css(css_for("zh", ZH_CSS_REPL)), encoding="utf-8")
(TPL / "zhorolor-index.html").write_text(ZH_INDEX, encoding="utf-8")
(TPL / "zhorolor-cart.html").write_text(ZH_CART, encoding="utf-8")
(TPL / "zhorolor-receipt.html").write_text(ZH_RECEIPT, encoding="utf-8")

print("Generated ZHOROLOR templates and CSS (ORDO left unchanged)")
