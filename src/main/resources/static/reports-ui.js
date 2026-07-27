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
        return new Date(iso).toLocaleString('ky-KG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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

    function renderBarChart(items, labelKey, valueKey, maxBars, valueIsMoney) {
        if (!items || !items.length) return '<p class="rep-empty">Маалымат жок</p>';
        const slice = items.slice(0, maxBars || 12);
        const max = Math.max(...slice.map(i => Number(i[valueKey] || 0)), 1);
        return '<div class="rep-chart">' + slice.map(i => {
            const val = Number(i[valueKey] || 0);
            const pct = Math.round((val / max) * 100);
            const label = i[labelKey] || i.monthName || i.date || '';
            const valText = valueIsMoney ? money(val) + ' с' : val + ' даана';
            return '<div class="rep-chart-row">' +
                '<span class="rep-chart-label" title="' + esc(label) + '">' + esc(label) + '</span>' +
                '<div class="rep-chart-bar-wrap"><div class="rep-chart-bar" style="width:' + pct + '%"></div></div>' +
                '<span class="rep-chart-val">' + valText + '</span>' +
                '</div>';
        }).join('') + '</div>';
    }

    function renderTopFoods(items) {
        if (!items.length) {
            return '<p class="rep-empty">Бул мезгилде тамак сатылган жок</p>';
        }
        const chartItems = items.slice(0, 10).map(f => ({ name: f.name, quantity: f.quantity }));
        return renderBarChart(chartItems, 'name', 'quantity', 10, false);
    }

    function renderSoldItemsTable(items) {
        if (!items.length) {
            return '<p class="rep-empty">Сатылган тамак жок</p>';
        }
        const total = totalSoldQty(items);
        return '<table class="rep-table">' +
            '<thead><tr><th>№</th><th>Тамак</th><th class="rep-num">Саны</th></tr></thead>' +
            '<tbody>' + items.map((f, i) => '<tr>' +
                '<td class="rep-muted">' + (i + 1) + '</td>' +
                '<td><strong>' + esc(f.name) + '</strong></td>' +
                '<td class="rep-num"><strong>' + f.quantity + '</strong></td>' +
            '</tr>').join('') + '</tbody>' +
            '<tfoot><tr>' +
                '<td colspan="2"><strong>Жалпы</strong></td>' +
                '<td class="rep-num"><strong>' + total + '</strong></td>' +
            '</tr></tfoot></table>';
    }

    function renderOrdersTable(orders) {
        if (!orders.length) {
            return '<p class="rep-empty">Бул мезгилде жеткирилген заказ жок</p>';
        }
        const totalSum = orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0);
        return '<table class="rep-table rep-table-orders">' +
            '<thead><tr>' +
                '<th>№</th><th>Кардар</th><th>Тамактар</th><th class="rep-num">Сумма</th><th>Убакыт</th>' +
            '</tr></thead>' +
            '<tbody>' + orders.map(o => '<tr>' +
                '<td><span class="rep-order-badge rep-order-badge-sm">' + esc(o.displayOrderNumber || o.id) + '</span></td>' +
                '<td><strong>' + esc(o.customerName || '—') + '</strong><br><span class="rep-muted">' + esc(o.phone || '') + '</span></td>' +
                '<td class="rep-items-cell">' + esc(o.itemName || '—') + '</td>' +
                '<td class="rep-num"><strong>' + money(o.totalPrice) + '</strong></td>' +
                '<td class="rep-muted">' + fmtTime(o.deliveredAt || o.createdAt) + '</td>' +
            '</tr>').join('') + '</tbody>' +
            '<tfoot><tr>' +
                '<td colspan="3"><strong>Жалпы (' + orders.length + ' заказ)</strong></td>' +
                '<td class="rep-num"><strong>' + money(totalSum) + ' сом</strong></td>' +
                '<td></td>' +
            '</tr></tfoot></table>';
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

                '<div class="rep-grid-2">' +
                    '<div class="rep-block">' +
                        '<h3 class="rep-title">🏆 Эң көп сатылган тамактар</h3>' +
                        '<p class="rep-sub">Топ-10 — канча дана сатылган</p>' +
                        renderTopFoods(sold) +
                    '</div>' +
                    '<div class="rep-block">' +
                        '<h3 class="rep-title">📋 Толук тизме</h3>' +
                        '<p class="rep-sub">Бардык тамактар жана саны</p>' +
                        renderSoldItemsTable(sold) +
                    '</div>' +
                '</div>' +

                '<div class="rep-block rep-block-full">' +
                    '<h3 class="rep-title">📦 Заказдар (' + orders.length + ')</h3>' +
                    '<p class="rep-sub">Ар бир жеткирилген заказ — кардар, тамак, сумма</p>' +
                    renderOrdersTable(orders) +
                '</div>' +

                ((data.topCustomers && data.topCustomers.length) ? (
                    '<div class="rep-block rep-block-full">' +
                        '<h3 class="rep-title">👥 Кайра заказ берген кардарлар</h3>' +
                        '<p class="rep-sub">Бир нече жолу заказ бергендер</p>' +
                        '<table class="rep-table">' +
                            '<thead><tr><th>Кардар / Телефон</th><th class="rep-num">Заказ саны</th></tr></thead>' +
                            '<tbody>' + data.topCustomers.map(c => '<tr>' +
                                '<td>' + esc(c.customer) + '</td>' +
                                '<td class="rep-num"><strong>' + c.orders + '</strong></td>' +
                            '</tr>').join('') + '</tbody>' +
                        '</table>' +
                    '</div>'
                ) : '') +

                (data.dailyChart ? (
                    '<div class="rep-block rep-block-full">' +
                        '<h3 class="rep-title">📈 Күн сайын киреше</h3>' +
                        '<p class="rep-sub">Ай ичинде ар бир күн канча сом түштү</p>' +
                        renderBarChart(data.dailyChart, 'date', 'totalRevenue', 31, true) +
                    '</div>'
                ) : '') +

                (data.monthlyChart ? (
                    '<div class="rep-block rep-block-full">' +
                        '<h3 class="rep-title">📈 Ай сайын киреше</h3>' +
                        '<p class="rep-sub">Жыл ичинде ар бир ай канча сом түштү</p>' +
                        renderBarChart(data.monthlyChart, 'monthName', 'totalRevenue', 12, true) +
                    '</div>'
                ) : '') +
            '</div>';
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

    return { renderReport, fetchSummary, fetchYears, fetchMonthly, money, esc, fmtTime };
})();
