(function () {
    const r = window.RESTAURANT || {};
    const slug = r.slug || '';
    const id = r.id;
    if (!id) {
        console.error('RESTAURANT.id жок — меню туура жükтөлбөйт');
    }

    window.restaurantBase = r.base || (slug ? '/' + slug : '/');
    window.restaurantSlug = slug;
    window.restaurantId = id;
    window.restaurantAcceptingOrders = r.acceptingOrders !== false;

    if (slug) {
        localStorage.setItem('lastRestaurantSlug', slug);
    }
    if (id != null) {
        localStorage.setItem('restaurantId', String(id));
    }

    (function loadClosedStyles() {
        if (document.querySelector('link[data-restaurant-closed-css]')) {
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/restaurant-closed.css?v=1';
        link.setAttribute('data-restaurant-closed-css', '1');
        document.head.appendChild(link);
    })();

    (function loadTelegramApp() {
        if (document.querySelector('script[data-telegram-app-js]')) {
            return;
        }
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '/telegram-app.css?v=1';
        css.setAttribute('data-telegram-app-css', '1');
        document.head.appendChild(css);

        const script = document.createElement('script');
        script.src = '/telegram-app.js?v=1';
        script.setAttribute('data-telegram-app-js', '1');
        document.head.appendChild(script);
    })();

    window.cartStorageKey = function () {
        return 'cart:' + slug;
    };

    /** @deprecated эски ключ — foodComment + deliveryComment колдонуңуз */
    window.orderCommentKey = function () {
        return 'orderComment:' + slug;
    };

    window.foodCommentKey = function () {
        return 'foodComment:' + slug;
    };

    window.deliveryCommentKey = function () {
        return 'deliveryComment:' + slug;
    };

    function migrateLegacyComment() {
        const legacy = localStorage.getItem(orderCommentKey());
        if (!legacy) {
            return;
        }
        if (!localStorage.getItem(foodCommentKey())) {
            localStorage.setItem(foodCommentKey(), legacy);
        }
        localStorage.removeItem(orderCommentKey());
    }

    window.getStoredCart = function () {
        try {
            const raw = localStorage.getItem(cartStorageKey());
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .map(function (item) {
                    return {
                        ...item,
                        quantity: Math.max(0, Math.round(Number(item.quantity || 0)))
                    };
                })
                .filter(function (item) {
                    return item.quantity > 0;
                });
        } catch (e) {
            return [];
        }
    };

    window.saveStoredCart = function (cart) {
        localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
    };

    window.getStoredFoodComment = function () {
        migrateLegacyComment();
        return localStorage.getItem(foodCommentKey()) || '';
    };

    window.saveStoredFoodComment = function (value) {
        localStorage.setItem(foodCommentKey(), String(value || '').trim());
    };

    window.getStoredDeliveryComment = function () {
        migrateLegacyComment();
        return localStorage.getItem(deliveryCommentKey()) || '';
    };

    window.saveStoredDeliveryComment = function (value) {
        localStorage.setItem(deliveryCommentKey(), String(value || '').trim());
    };

    window.clearStoredOrderComments = function () {
        localStorage.removeItem(foodCommentKey());
        localStorage.removeItem(deliveryCommentKey());
        localStorage.removeItem(orderCommentKey());
    };

    /** @deprecated deliveryComment колдонуңуз */
    window.getStoredComment = function () {
        return getStoredDeliveryComment();
    };

    /** @deprecated deliveryComment колдонуңуз */
    window.saveStoredComment = function (value) {
        saveStoredDeliveryComment(value);
    };

    window.rUrl = function (path) {
        if (!path || path === '/') {
            return restaurantBase;
        }
        const p = path.charAt(0) === '/' ? path : '/' + path;
        return restaurantBase + p;
    };

    window.getBankPhone = function () {
        return (window.RESTAURANT && window.RESTAURANT.bankPhone) || '0600 600 828';
    };

    window.getBankRecipientName = function () {
        return (window.RESTAURANT && window.RESTAURANT.bankRecipientName) || 'Ратбек С.';
    };

    window.bankPhoneDigits = function () {
        return getBankPhone().replace(/\D/g, '');
    };

    window.applyBankPaymentInfo = function () {
        const phone = getBankPhone();
        const recipient = getBankRecipientName();
        const phoneEl = document.getElementById('bankPhoneNumber') || document.getElementById('bankNumber');
        if (phoneEl) phoneEl.textContent = phone;
        const recipientEl = document.getElementById('recipientLabel');
        if (recipientEl) {
            const prefix = (window.CustomerI18n && CustomerI18n.t('recipientPrefix')) || 'Алуучу:';
            recipientEl.textContent = prefix + ' ' + recipient;
        }
        const recipientValueEl = document.getElementById('bankRecipientValue');
        if (recipientValueEl) recipientValueEl.textContent = recipient;
    };

    function closedTexts() {
        const lang = window.CustomerI18n && CustomerI18n.getLang ? CustomerI18n.getLang() : 'ky';
        if (lang === 'ru') {
            return {
                title: 'Сегодня ресторан закрыт',
                sub: 'Заказы временно не принимаются. Зайдите позже.'
            };
        }
        return {
            title: 'Бүгүн ресторан жабылды',
            sub: 'Заказдар убактылуу кабыл алынбайт. Кийин кайра кириңиз.'
        };
    }

    window.isRestaurantOpen = function () {
        return window.restaurantAcceptingOrders !== false;
    };

    window.applyRestaurantClosedOverlay = function () {
        const existing = document.getElementById('restaurant-closed-overlay');
        if (window.isRestaurantOpen()) {
            if (existing) existing.remove();
            document.body.classList.remove('restaurant-closed');
            return;
        }
        if (existing) return;
        const texts = closedTexts();
        const overlay = document.createElement('div');
        overlay.id = 'restaurant-closed-overlay';
        overlay.className = 'restaurant-closed-overlay';
        overlay.innerHTML =
            '<div class="restaurant-closed-card">' +
            '<div class="restaurant-closed-icon">🔒</div>' +
            '<h2>' + texts.title + '</h2>' +
            '<p>' + texts.sub + '</p>' +
            '</div>';
        document.body.appendChild(overlay);
        document.body.classList.add('restaurant-closed');
    };

    window.refreshRestaurantStatus = async function () {
        if (!id) {
            window.applyRestaurantClosedOverlay();
            return;
        }
        try {
            const res = await fetch('/api/restaurants/' + encodeURIComponent(id));
            if (res.ok) {
                const data = await res.json();
                window.restaurantAcceptingOrders = data.acceptingOrders !== false;
            }
        } catch (e) {
            /* keep last known state */
        }
        window.applyRestaurantClosedOverlay();
    };

    document.addEventListener('DOMContentLoaded', function () {
        window.refreshRestaurantStatus();
        setInterval(window.refreshRestaurantStatus, 30000);
    });

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            window.refreshRestaurantStatus();
        }
    });

    if (window.CustomerI18n && CustomerI18n.onLanguageChange) {
        CustomerI18n.onLanguageChange(function () {
            const overlay = document.getElementById('restaurant-closed-overlay');
            if (overlay) {
                overlay.remove();
            }
            window.applyRestaurantClosedOverlay();
        });
    }
})();
