#!/usr/bin/env python3
"""Restore ORDO menu index + cart to match committed Wolt/Glovo gold CSS (do not touch CSS)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "main" / "resources"
TPL = ROOT / "templates"

AI_IDX = (TPL / "aga-ini-index.html").read_text(encoding="utf-8")
BM_CART = (TPL / "burger-men-cart.html").read_text(encoding="utf-8")


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


def html_for_ordo_cart(text: str) -> str:
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


OLD_HERO_START = '    <header class="hero">'
OLD_HERO_END = '    </header>\n\n    <div id="categoryList" class="categories"></div>'

NEW_HERO = """    <div class="hero-section">
        <header
                class="hero-banner"
                th:style="|background-image: url('${restaurantBanner != null && !#strings.isEmpty(restaurantBanner) ? restaurantBanner : '/restaurant/ordo-cafe/hero-bg.jpg'}');|"
        >
            <div class="hero-overlay" aria-hidden="true"></div>

            <div class="hero-inner">

                <div class="hero-lang">
                    <div class="lang-capsule">
                        <button id="kyButton" type="button" class="lang-btn active" onclick="changeLanguage('ky')">
                            Кыргызча
                        </button>
                        <span class="lang-sep">/</span>
                        <button id="ruButton" type="button" class="lang-btn" onclick="changeLanguage('ru')">
                            Русский
                        </button>
                    </div>
                </div>

                <div class="hero-brand-block">
                    <div class="hero-logo-ring">
                        <img
                                th:if="${restaurantLogo != null && !#strings.isEmpty(restaurantLogo)}"
                                th:src="${restaurantLogo}"
                                th:alt="${restaurantName}"
                                src="/restaurant/ordo-cafe/logo.png"
                                alt="ordo-cafe"
                                class="hero-logo-img"
                                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                        >
                        <span class="hero-logo-fallback"
                              th:text="${restaurantEmoji != null && !#strings.isEmpty(restaurantEmoji) ? restaurantEmoji : 'OC'}">🍽</span>
                    </div>

                    <div class="hero-info">
                        <h1 class="hero-title" th:text="${restaurantName}">ОРДО КАФЕ</h1>
                        <p class="hero-meta">
                            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z"/>
                                <circle cx="12" cy="10" r="2.5"/>
                            </svg>
                            <span id="locationText">Базар-Коргон шаары</span>
                        </p>
                        <p class="hero-meta">
                            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                <circle cx="12" cy="12" r="9"/>
                                <path d="M12 7v5l3 2"/>
                            </svg>
                            <span id="workingHoursText">Күн сайын 09:00–20:00</span>
                        </p>
                    </div>
                </div>

                <a th:href="${restaurantBase + '/cart'}" href="/ordo-cafe/cart" class="hero-cart-glass">
                    <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path d="M6 6h15l-1.5 9h-12z"/>
                        <circle cx="9" cy="20" r="1.5"/>
                        <circle cx="18" cy="20" r="1.5"/>
                        <path d="M6 6L5 3H2"/>
                    </svg>
                    <span class="hero-cart-label" id="headerCartText">Себет</span>
                    <span class="hero-cart-sum" id="headerCartAmount">0 сом</span>
                </a>

                <div class="hero-badges">
                    <span class="hero-badge" id="badgeRating">⭐ 4.9 рейтинг</span>
                    <span class="hero-badge" id="badgeDelivery">🚚 20–40 мин</span>
                    <span class="hero-badge" id="badgeCuisine">🥘 Улуттук ашкана</span>
                </div>

            </div>
        </header>
    </div>

    <div class="search-wrap">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input
                id="searchInput"
                type="text"
                placeholder="Тамак издөө..."
                oninput="handleSearch()"
        >
        <button
                id="clearSearchButton"
                type="button"
                class="clear-search"
                onclick="clearSearch()"
        >
            ✕
        </button>
    </div>"""


def patch_index(text: str) -> str:
    text = html_for_ordo(text)

    start = text.index(OLD_HERO_START)
    end = text.index(OLD_HERO_END, start)

    text = text[:start] + NEW_HERO + """

    <div id="categoryList" class="categories"></div>""" + text[end + len(OLD_HERO_END):]

    text = text.replace(
        """        ky: {
            workingHours: 'Күн сайын 09:00 — 20:00',
            location: 'Базар-Коргон',
            cart: '🛒 Себет',""",
        """        ky: {
            workingHours: 'Күн сайын 09:00–20:00',
            location: 'Базар-Коргон шаары',
            cart: 'Себет',
            badgeRating: '⭐ 4.9 рейтинг',
            badgeDelivery: '🚚 20–40 мин',
            badgeCuisine: '🥘 Улуттук ашкана',""",
    )

    text = text.replace(
        """        ru: {
            workingHours: 'Ежедневно 09:00 — 20:00',
            location: 'Базар-Коргон',
            cart: '🛒 Корзина',""",
        """        ru: {
            workingHours: 'Ежедневно 09:00–20:00',
            location: 'г. Базар-Коргон',
            cart: 'Корзина',
            badgeRating: '⭐ 4.9 рейтинг',
            badgeDelivery: '🚚 20–40 мин',
            badgeCuisine: '🥘 Национальная кухня',""",
    )

    text = text.replace(
        """        document.getElementById('headerCartText').textContent =
            t('cart');

        document.getElementById('searchInput').placeholder =""",
        """        document.getElementById('headerCartText').textContent =
            t('cart');

        document.getElementById('badgeRating').textContent =
            t('badgeRating');

        document.getElementById('badgeDelivery').textContent =
            t('badgeDelivery');

        document.getElementById('badgeCuisine').textContent =
            t('badgeCuisine');

        document.getElementById('searchInput').placeholder =""",
    )

    return text


if __name__ == "__main__":
    index = patch_index(AI_IDX)
    (TPL / "ordo-cafe-index.html").write_text(index, encoding="utf-8")
    (TPL / "ordo-cafe-cart.html").write_text(html_for_ordo_cart(BM_CART), encoding="utf-8")
    print("Restored ORDO index + cart (Wolt/Glovo gold, matches git CSS)")
