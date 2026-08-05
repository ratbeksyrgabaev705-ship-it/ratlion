/**
 * Бөлüşкөн отчет интерфейси — статистика жеткирилген заказдардан гана.
 */
window.ReportsUI = (function () {
    function money(v) {
        return Number(v || 0).toLocaleString('ky-KG', { maximumFractionDigits: 0 });
    }
    function esc(v) {
        return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function fmtTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('ky-KG', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function paymentLabel(status) {
        if (status === 'PAID') return 'Төлөндү';
        if (status === 'WAITING_PAYMENT' || status === 'WAITING') return 'Күтүлүүдө';
        return status || '—';
    }

    function soldItemsList(data) {
        if (data.topFoods && data.topFoods.length) {
            return data.topFoods.map(f => ({ name: f.name, quantity: f.quantity }));
        }
        return Object.entries(data.soldItems || {})
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity);
    }

    function totalSoldQty(items) {
        return items.reduce((s, i) => s + Number(i.quantity || 0), 0);
    }

    function periodHeading(data) {
        const type = data.reportType || '';
        const date = data.date || data.periodLabel || '';
        const titles = {
            live: 'Коруу — азыркы убакытка чейин',
            daily: 'Күнүмдük отчет',
            evening: 'Кечки отчет (17:00 – 24:00)',
            weekly: 'Апталык отчет (7 күн)',
            monthly: 'Айлык отчет',
            yearly: 'Жылдык отчет',
            range: 'Тандалган мезгил'
        };
        const title = titles[type] || 'Отчет';
        return { title, date };
    }

    function sortOrdersChronological(orders) {
        return orders.slice().sort(function (a, b) {
            const ta = new Date(a.deliveredAt || a.createdAt).getTime();
            const tb = new Date(b.deliveredAt || b.createdAt).getTime();
            return ta - tb;
        });
    }

    function formatOrderItems(itemName) {
        if (!itemName || !String(itemName).trim()) {
            return '<p class="rep-muted">Состав жок</p>';
        }
        return String(itemName).split(',').map(function (part) {
            const t = part.trim();
            return t ? '<div class="rep-order-item-line">' + esc(t) + '</div>' : '';
        }).join('');
    }

    function renderOrdersList(orders) {
        const sorted = sortOrdersChronological(orders);
        if (!sorted.length) {
            return '<p class="rep-empty">Бул мезгилде жеткирилген заказ жок</p>';
        }
        return '<div class="rep-orders-list">' + sorted.map(function (o, i) {
            const domId = 'rep-ord-' + (o.id != null ? o.id : i);
            const sum = money(o.paymentAmount != null ? o.paymentAmount : o.totalPrice);
            const payOk = o.paymentStatus === 'PAID';
            return '<div class="rep-order-row">' +
                '<button type="button" class="rep-order-head" onclick="ReportsUI.toggleOrderDetail(\'' + domId + '\', this)">' +
                    '<div class="rep-order-head-left">' +
                        '<span class="rep-order-name">' + esc(o.customerName || '—') + '</span>' +
                        '<span class="rep-order-phone">' + esc(o.phone || '—') + '</span>' +
                    '</div>' +
                    '<div class="rep-order-head-right">' +
                        '<span class="rep-order-sum">' + sum + ' с</span>' +
                        '<span class="rep-order-pay' + (payOk ? ' rep-pay-ok' : '') + '">' + esc(paymentLabel(o.paymentStatus)) + '</span>' +
                        '<span class="rep-order-time">' + fmtTime(o.deliveredAt || o.createdAt) + '</span>' +
                        '<span class="rep-order-chevron">›</span>' +
                    '</div>' +
                '</button>' +
                '<div id="' + domId + '" class="rep-order-detail" hidden>' +
                    '<div class="rep-order-detail-box">' +
                        '<div class="rep-order-detail-head">Заказ № ' + esc(o.displayOrderNumber || o.id) + '</div>' +
                        '<div class="rep-order-detail-label">Состав:</div>' +
                        formatOrderItems(o.itemName) +
                        (o.comment ? '<div class="rep-order-comment">💬 ' + esc(o.comment) + '</div>' : '') +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    }

    function renderSoldPositions(items) {
        if (!items.length) {
            return '<p class="rep-empty">Сатылган тамак жок</p>';
        }
        return '<div class="rep-pos-list">' + items.map(function (f) {
            return '<div class="rep-pos-row">' +
                '<span class="rep-pos-name">' + esc(f.name) + '</span>' +
                '<span class="rep-pos-qty">— ' + f.quantity + '×</span>' +
            '</div>';
        }).join('') + '</div>';
    }

    function renderReport(data) {
        if (!data) return '<div class="rep-empty">Отчет жок</div>';
        const sold = soldItemsList(data);
        const orders = data.orders || [];
        const orderCount = data.completedOrders || orders.length || 0;
        const period = periodHeading(data);
        const avgCheck = money(data.averageOrderAmount);
        const revenue = money(data.totalRevenue);
        const cancelled = data.cancelledOrders || 0;

        return '' +
            '<div class="rep-wrap">' +
                '<div class="rep-header">' +
                    '<div class="rep-header-main">' +
                        '<h2 class="rep-header-title">' + esc(period.title) + '</h2>' +
                        '<p class="rep-header-date">' + esc(period.date) + '</p>' +
                    '</div>' +
                    (data.restaurantName ? '<span class="rep-header-rest">' + esc(data.restaurantName) + '</span>' : '') +
                '</div>' +

                '<div class="rep-hero">' +
                    '<div class="rep-hero-card rep-hero-revenue">' +
                        '<span class="rep-hero-icon">💰</span>' +
                        '<div><label>Киреше</label><strong>' + revenue + ' <small>сом</small></strong></div>' +
                    '</div>' +
                    '<div class="rep-hero-card">' +
                        '<span class="rep-hero-icon">📦</span>' +
                        '<div><label>Жеткирилген заказ</label><strong>' + orderCount + '</strong></div>' +
                    '</div>' +
                    '<div class="rep-hero-card">' +
                        '<span class="rep-hero-icon">🧾</span>' +
                        '<div><label>Орточо чек</label><strong>' + avgCheck + ' <small>сом</small></strong></div>' +
                    '</div>' +
                    '<div class="rep-hero-card">' +
                        '<span class="rep-hero-icon">🍽</span>' +
                        '<div><label>Сатылган тамак</label><strong>' + (data.totalQuantity || totalSoldQty(sold)) + ' <small>дана</small></strong></div>' +
                    '</div>' +
                '</div>' +

                (cancelled > 0 ? '<div class="rep-note rep-note-warn">⚠️ Бул мезгилде <strong>' + cancelled + '</strong> заказ жокко чыгарылган (киреше эсептелбейт)</div>' : '') +

                '<div class="rep-tabs">' +
                    '<button type="button" class="rep-tab active" onclick="ReportsUI.switchTab(this, \'orders\')">📦 Буйрутмалардын тизмеси</button>' +
                    '<button type="button" class="rep-tab" onclick="ReportsUI.switchTab(this, \'positions\')">🍽 Сатылган позициялар</button>' +
                '</div>' +

                '<div class="rep-tab-panel" id="repTabOrders">' + renderOrdersList(orders) + '</div>' +
                '<div class="rep-tab-panel" id="repTabPositions" hidden>' + renderSoldPositions(sold) + '</div>' +
            '</div>';
    }

    function switchTab(btn, tab) {
        document.querySelectorAll('#kRepResult .rep-tab').forEach(function (b) {
            b.classList.toggle('active', b === btn);
        });
        const ordersPanel = document.getElementById('repTabOrders');
        const posPanel = document.getElementById('repTabPositions');
        if (ordersPanel) ordersPanel.hidden = tab !== 'orders';
        if (posPanel) posPanel.hidden = tab !== 'positions';
    }

    function toggleOrderDetail(domId, btn) {
        const detail = document.getElementById(domId);
        if (!detail) return;
        const willOpen = detail.hidden;
        document.querySelectorAll('#kRepResult .rep-order-detail').forEach(function (el) {
            el.hidden = true;
        });
        document.querySelectorAll('#kRepResult .rep-order-head').forEach(function (el) {
            el.classList.remove('open');
        });
        if (willOpen) {
            detail.hidden = false;
            if (btn) btn.classList.add('open');
        }
    }

    async function fetchSummary(preset, restaurantId, from, to) {
        let url = '/reports/summary?preset=' + encodeURIComponent(preset);
        if (restaurantId) url += '&restaurantId=' + encodeURIComponent(restaurantId);
        if (from) url += '&from=' + encodeURIComponent(from);
        if (to) url += '&to=' + encodeURIComponent(to);
        const res = await fetch(url);
        return res.json();
    }

    async function fetchYears(restaurantId) {
        let url = '/reports/years';
        if (restaurantId) url += '?restaurantId=' + encodeURIComponent(restaurantId);
        const res = await fetch(url);
        return res.json();
    }

    async function fetchMonthly(year, month, restaurantId) {
        let url = '/reports/monthly?year=' + year + '&month=' + month;
        if (restaurantId) url += '&restaurantId=' + encodeURIComponent(restaurantId);
        const res = await fetch(url);
        return res.json();
    }

    async function fetchDaily(date, restaurantId) {
        let url = '/reports/daily?date=' + encodeURIComponent(date);
        if (restaurantId) url += '&restaurantId=' + encodeURIComponent(restaurantId);
        const res = await fetch(url);
        return res.json();
    }

    async function fetchCalendar(year, month, restaurantId) {
        let url = '/reports/calendar?year=' + year + '&month=' + month;
        if (restaurantId) url += '&restaurantId=' + encodeURIComponent(restaurantId);
        const res = await fetch(url);
        return res.json();
    }

    return {
        renderReport, fetchSummary, fetchYears, fetchMonthly, fetchDaily, fetchCalendar,
        switchTab, toggleOrderDetail, money, esc, fmtTime
    };
})();
