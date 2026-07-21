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

    if (slug) {
        localStorage.setItem('lastRestaurantSlug', slug);
    }
    if (id != null) {
        localStorage.setItem('restaurantId', String(id));
    }

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
})();
