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

    function renderBarChart(items, labelKey, valueKey, maxBars) {
        if (!items || !items.length) return '<p class="rep-empty">Маалымат жок</p>';
        const slice = items.slice(0, maxBars || 12);
        const max = Math.max(...slice.map(i => Number(i[valueKey] || 0)), 1);
        return `<div class="rep-chart">${slice.map(i => {
            const val = Number(i[valueKey] || 0);
            const pct = Math.round((val / max) * 100);
            const label = i[labelKey] || i.monthName || i.date || '';
            return `<div class="rep-chart-row">
                <span class="rep-chart-label">${esc(label)}</span>
                <div class="rep-chart-bar-wrap"><div class="rep-chart-bar" style="width:${pct}%"></div></div>
                <span class="rep-chart-val">${valueKey === 'totalRevenue' ? money(val) : val}</span>
            </div>`;
        }).join('')}</div>`;
    }

    function renderSoldItemsTable(items) {
        if (!items.length) {
            return '<p class="rep-empty">Сатылган тамак жок</p>';
        }
        const total = totalSoldQty(items);
        return `<table class="rep-table">
            <thead><tr><th>№</th><th>Тамак</th><th class="rep-num">Саны</th></tr></thead>
            <tbody>${items.map((f, i) => `<tr>
                <td class="rep-muted">${i + 1}</td>
                <td><strong>${esc(f.name)}</strong></td>
                <td class="rep-num"><strong>${f.quantity}</strong></td>
            </tr>`).join('')}</tbody>
            <tfoot><tr>
                <td colspan="2"><strong>Жалпы</strong></td>
                <td class="rep-num"><strong>${total}</strong></td>
            </tr></tfoot>
        </table>`;
    }

    function renderOrderNumbers(orders) {
        if (!orders.length) {
            return '<p class="rep-empty">Заказ жок</p>';
        }
        return `<div class="rep-order-nums">${orders.map(o =>
            `<span class="rep-order-badge">${esc(o.displayOrderNumber || '#' + o.id)}</span>`
        ).join('')}</div>`;
    }

    function renderOrdersTable(orders) {
        if (!orders.length) {
            return '<p class="rep-empty">Заказ жок</p>';
        }
        return `<table class="rep-table rep-table-orders">
            <thead><tr>
                <th>Заказ №</th><th>Кардар</th><th>Телефон</th><th>Сатылган тамактар</th><th class="rep-num">Сумма</th><th>Жеткирилди</th>
            </tr></thead>
            <tbody>${orders.map(o => `<tr>
                <td><span class="rep-order-badge rep-order-badge-sm">${esc(o.displayOrderNumber || o.id)}</span></td>
                <td>${esc(o.customerName)}</td>
                <td>${esc(o.phone)}</td>
                <td class="rep-items-cell">${esc(o.itemName || '—')}</td>
                <td class="rep-num"><strong>${money(o.totalPrice)}</strong></td>
                <td class="rep-muted">${fmtTime(o.deliveredAt || o.createdAt)}</td>
            </tr>`).join('')}</tbody>
            <tfoot><tr>
                <td colspan="4"><strong>Жалпы (${orders.length} заказ)</strong></td>
                <td class="rep-num"><strong>${money(orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0))}</strong></td>
                <td></td>
            </tr></tfoot>
        </table>`;
    }

    function renderReport(data) {
        if (!data) return '<div class="rep-empty">Отчет жок</div>';
        const sold = soldItemsList(data);
        const orders = data.orders || [];
        const orderCount = data.completedOrders || orders.length || 0;

        return `
            <div class="rep-wrap">
                <div class="rep-meta">
                    📊 <strong>${esc(data.restaurantName || '')}</strong>
                    · ${esc(data.date || data.periodLabel || '')}
                    · <span class="rep-tag">Жеткирилген гана</span>
                </div>

                <div class="rep-stats">
                    <div class="rep-stat"><label>Заказдар</label><strong>${orderCount}</strong></div>
                    <div class="rep-stat"><label>Киреше</label><strong>${money(data.totalRevenue)} <small>сом</small></strong></div>
                    <div class="rep-stat"><label>Орточо чек</label><strong>${money(data.averageOrderAmount)}</strong></div>
                    <div class="rep-stat"><label>Сатылган дана</label><strong>${data.totalQuantity || totalSoldQty(sold)}</strong></div>
                    <div class="rep-stat"><label>Четке кагылган</label><strong>${data.cancelledOrders || 0}</strong></div>
                    <div class="rep-stat"><label>Кардарлар</label><strong>${data.customers || 0}</strong></div>
                </div>

                <div class="rep-grid-2">
                    <div class="rep-block">
                        <h3 class="rep-title">📋 Заказ №лөр <span class="rep-count">(${orders.length})</span></h3>
                        ${renderOrderNumbers(orders)}
                    </div>
                    <div class="rep-block">
                        <h3 class="rep-title">🍽 Сатылган тамактар — жалпы <span class="rep-count">(${totalSoldQty(sold)} дана)</span></h3>
                        ${renderSoldItemsTable(sold)}
                    </div>
                </div>

                <div class="rep-block rep-block-full">
                    <h3 class="rep-title">📦 Заказдар тизмеси <span class="rep-count">(${orders.length})</span></h3>
                    ${renderOrdersTable(orders)}
                </div>

                ${(data.topCustomers && data.topCustomers.length) ? `
                <div class="rep-block rep-block-full">
                    <h3 class="rep-title">👤 Кардарлар</h3>
                    <table class="rep-table">
                        <thead><tr><th>Кардар / Телефон</th><th class="rep-num">Заказ</th></tr></thead>
                        <tbody>${data.topCustomers.map(c => `<tr>
                            <td>${esc(c.customer)}</td>
                            <td class="rep-num"><strong>${c.orders}</strong></td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>` : ''}

                ${data.dailyChart ? `<div class="rep-block rep-block-full"><h3 class="rep-title">Күндük киреше</h3>${renderBarChart(data.dailyChart, 'date', 'totalRevenue')}</div>` : ''}
                ${data.monthlyChart ? `<div class="rep-block rep-block-full"><h3 class="rep-title">Айлык киреше</h3>${renderBarChart(data.monthlyChart, 'monthName', 'totalRevenue')}</div>` : ''}
            </div>`;
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
        let url = `/reports/monthly?year=${year}&month=${month}`;
        if (restaurantId) url += '&restaurantId=' + encodeURIComponent(restaurantId);
        const res = await fetch(url);
        return res.json();
    }

    return { renderReport, fetchSummary, fetchYears, fetchMonthly, money, esc, fmtTime };
})();
