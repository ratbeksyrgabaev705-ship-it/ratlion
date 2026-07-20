(function () {
    let restaurants = [];
    let restaurantMap = {};
    let newOrders = [];
    let currentOrder = null;
    let operatorName = localStorage.getItem('ratlionOperator') || 'Оператор';
    let courierActivityTimer = null;

    const AYLAR = ['Учт', 'Бир', 'Же', 'Чап', 'Беш', 'Кул', 'Тек', 'Баш', 'Аяк', 'Тог', 'Жет', 'Бек'];

    function q(id) { return document.getElementById(id); }
    function money(v) { return Number(v || 0).toLocaleString('ky-KG', { maximumFractionDigits: 0 }); }
    function toast(msg) {
        let el = q('dToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'dToast';
            el.className = 'delivery-toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(function () { el.classList.remove('show'); }, 3500);
    }
    function esc(v) {
        return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function fmtTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('ky-KG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    function restName(id) {
        const r = restaurantMap[id];
        return r ? r.name : '—';
    }
    function statusLabel(status) {
        const map = {
            NEW: 'Жаңы',
            ACCEPTED: 'Кабыл алынды',
            COOKING: 'Даярдалууда',
            READY: 'Даяр',
            GIVEN_TO_COURIER: 'Курьерге берилди',
            DELIVERED: 'Жеткирилди',
            CANCELLED: 'Четке кагылды'
        };
        return map[status] || status || '—';
    }
    function statusBadgeClass(status) {
        if (status === 'NEW') return 'delivery-badge-new';
        if (status === 'DELIVERED') return 'delivery-badge-delivered';
        if (status === 'CANCELLED') return 'delivery-badge-cancelled';
        if (status === 'COOKING' || status === 'READY') return 'delivery-badge-cooking';
        return 'delivery-badge-accepted';
    }
    function paymentLabel(status) {
        if (status === 'PAID') return 'Төлөндү';
        if (status === 'WAITING_PAYMENT' || status === 'WAITING') return 'Төлөм күтүлүүдө';
        return status || '—';
    }
    function timelineRow(label, iso) {
        if (!iso) return '';
        return `<div><label>${esc(label)}</label><span>${fmtTime(iso)}</span></div>`;
    }
    function restPrefix(restaurantId) {
        const r = restaurantMap[restaurantId];
        return (r && r.orderPrefix) ? r.orderPrefix : 'OD';
    }
    function formatOrderNumber(order) {
        if (order.displayOrderNumber) return order.displayOrderNumber;
        return restPrefix(order.restaurantId) + order.id;
    }
    function renderOrderDetail(order) {
        const num = formatOrderNumber(order);
        return `
            <div class="delivery-detail-grid">
                <div class="delivery-detail-row">
                    <strong>Абалы</strong>
                    <span><span class="delivery-badge ${statusBadgeClass(order.orderStatus)}">${esc(statusLabel(order.orderStatus))}</span></span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Ресторан</strong>
                    <span>${esc(restName(order.restaurantId))}</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Кардар</strong>
                    <span>${esc(order.customerName)}</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Телефон</strong>
                    <span>${esc(order.phone)}</span>
                </div>
                <div class="delivery-detail-row full">
                    <strong>Дарек</strong>
                    <span>${esc(order.address || '—')}</span>
                </div>
                ${order.comment ? `<div class="delivery-detail-row full"><strong>Комментарий</strong><span>${esc(order.comment)}</span></div>` : ''}
                <div class="delivery-detail-row full">
                    <strong>Тамактар</strong>
                    <div class="delivery-detail-items">${esc(order.itemName || '—')}</div>
                </div>
                <div class="delivery-detail-row">
                    <strong>Жалпы дана</strong>
                    <span>${order.quantity != null ? order.quantity : '—'}</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Жалпы сумма</strong>
                    <span><strong>${money(order.totalPrice)} сом</strong></span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Төлөнгөн сумма</strong>
                    <span>${money(order.paymentAmount != null ? order.paymentAmount : order.totalPrice)} сом</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Төлөм абалы</strong>
                    <span>${esc(paymentLabel(order.paymentStatus))}</span>
                </div>
                ${order.operatorName ? `<div class="delivery-detail-row"><strong>Оператор</strong><span>${esc(order.operatorName)}</span></div>` : ''}
                <div class="delivery-detail-row full">
                    <strong>Убакыт тарыхы</strong>
                    <div class="delivery-detail-timeline">
                        ${timelineRow('Түзүлгөн', order.createdAt)}
                        ${timelineRow('Кабыл алынды', order.acceptedAt)}
                        ${timelineRow('Даярдалууда', order.cookingStartedAt)}
                        ${timelineRow('Даяр', order.readyAt)}
                        ${timelineRow('Курьерге', order.courierAt)}
                        ${timelineRow('Жеткирилди', order.deliveredAt)}
                    </div>
                </div>
                <div class="delivery-detail-row full delivery-receipt">
                    <strong>Төлөмдүн чеги</strong>
                    ${order.receiptImagePath
                        ? `<img src="${esc(order.receiptImagePath)}" alt="Төлөмдүн чеги" onclick="window.open('${esc(order.receiptImagePath)}')">`
                        : '<span>—</span>'}
                </div>
            </div>`;
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    async function init() {
        q('dOperator').value = operatorName;
        await loadRestaurants();
        PushNotify.bindButton(q('dPushBtn'), q('dPushStatus'));
        dNav('dashboard', document.querySelector('[data-sec="dashboard"]'));
        setInterval(refreshDashboard, 8000);
        window.addEventListener('hashchange', handleHash);
    }

    async function loadRestaurants() {
        const res = await fetch('/api/restaurants');
        restaurants = await res.json();
        restaurantMap = {};
        restaurants.forEach(r => { restaurantMap[r.id] = r; });
    }

    window.dNav = function (section, btn) {
        document.querySelectorAll('.delivery-nav-item').forEach(n => n.classList.remove('active'));
        if (btn) btn.classList.add('active');
        document.querySelectorAll('.delivery-section').forEach(s => s.classList.remove('active'));
        q('sec-' + section).classList.add('active');
        location.hash = section;
        if (section === 'dashboard') refreshDashboard();
        if (section === 'new-orders') loadNewOrders();
        if (section === 'restaurants') renderRestaurants();
        if (section === 'reports') initReports();
        if (section === 'history') { populateHistRest(); loadHistory(); }
        if (section === 'couriers') {
            loadCouriers();
            loadCourierActivity();
            if (courierActivityTimer) clearInterval(courierActivityTimer);
            courierActivityTimer = setInterval(loadCourierActivity, 8000);
        } else if (courierActivityTimer) {
            clearInterval(courierActivityTimer);
            courierActivityTimer = null;
        }
        if (section === 'settings') { /* noop */ }
    };

    function handleHash() {
        const h = (location.hash || '#dashboard').replace('#', '');
        const btn = document.querySelector(`.delivery-nav-item[data-sec="${h}"]`);
        if (btn) dNav(h, btn);
    }

    async function refreshDashboard() {
        try {
            const [newRes, allRes, todayRep] = await Promise.all([
                fetch('/orders/new'),
                fetch('/orders'),
                fetch('/reports/today')
            ]);
            newOrders = await newRes.json();
            const all = await allRes.json();
            const today = await todayRep.json();

            const incoming = PushNotify.checkNew('admin-new', newOrders, function (o) { return o.id; }, {
                sound: 'urgent',
                title: function (o) { return '🔔 Жаңы заказ — ' + restName(o.restaurantId); },
                body: function (o) {
                    return formatOrderNumber(o) + ' · ' + (o.customerName || '') + ' · ' + money(o.totalPrice) + ' сом';
                },
                tag: function (o) { return 'new-order-' + o.id; },
                onNotify: function (items) {
                    const o = items[0];
                    if (o) toast('🔔 Жаңы заказ: ' + formatOrderNumber(o) + ' — чекти текшериңиз');
                }
            });

            const todayDelivered = all.filter(o => o.orderStatus === 'DELIVERED' && (o.deliveredAt || o.createdAt || '').slice(0, 10) === todayStr());
            const pending = all.filter(o => o.orderStatus === 'NEW');
            const delivered = all.filter(o => o.orderStatus === 'DELIVERED');
            const cancelled = all.filter(o => o.orderStatus === 'CANCELLED');

            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            const monthRep = await fetch('/reports/monthly?year=' + year + '&month=' + month).then(r => r.json());

            const restRev = {};
            delivered.forEach(o => {
                if (!o.restaurantId) return;
                restRev[o.restaurantId] = (restRev[o.restaurantId] || 0) + Number(o.totalPrice || 0);
            });
            let topRestId = null, topRestRev = 0;
            Object.entries(restRev).forEach(([id, rev]) => {
                if (rev > topRestRev) { topRestRev = rev; topRestId = id; }
            });

            const sold = today.soldItems || {};
            const topFood = Object.entries(sold).sort((a,b) => b[1]-a[1])[0];

            q('dStatTodayOrders').textContent = today.totalOrders || todayDelivered.length;
            q('dStatTodayRev').textContent = money(today.totalRevenue) + ' с';
            q('dStatPending').textContent = pending.length;
            q('dStatDelivered').textContent = delivered.length;
            q('dStatCancelled').textContent = cancelled.length;
            q('dStatRest').textContent = restaurants.length;
            q('dStatMonthRev').textContent = money(monthRep.totalRevenue) + ' с';
            q('dStatTopRest').textContent = topRestId ? restName(Number(topRestId)) : '—';
            q('dStatTopFood').textContent = topFood ? topFood[0] : '—';
            q('dBadgeNew').textContent = newOrders.length;
        } catch (e) { /* silent */ }
    }

    async function loadNewOrders() {
        try {
            const res = await fetch('/orders/new');
            newOrders = await res.json();
            q('dBadgeNew').textContent = newOrders.length;
            const el = q('dNewList');
            if (!newOrders.length) {
                el.innerHTML = '<div class="delivery-empty">Текшериле турган заказ жок</div>';
                return;
            }
            el.innerHTML = `<table class="delivery-table"><thead><tr>
                <th>Ресторан</th><th>Заказ №</th><th>Кардар</th><th>Телефон</th><th>Сумма</th><th>Убакыт</th>
            </tr></thead><tbody>${newOrders.map(o => `
                <tr class="delivery-order-row" onclick="dOpenOrder(${o.id})">
                    <td>${esc(restName(o.restaurantId))}</td>
                    <td><strong>${esc(formatOrderNumber(o))}</strong></td>
                    <td>${esc(o.customerName)}</td>
                    <td>${esc(o.phone)}</td>
                    <td>${money(o.totalPrice)} сом</td>
                    <td>${fmtTime(o.createdAt)}</td>
                </tr>`).join('')}</tbody></table>`;
        } catch (e) { q('dNewList').innerHTML = '<div class="delivery-empty">Жүктөлбөдү</div>'; }
    }

    function renderRestaurants() {
        q('dRestGrid').innerHTML = restaurants.map(r => `
            <article class="delivery-rest-card" onclick="dOpenRestaurant(${r.id})">
                <h3>${r.emoji || '🏪'} ${esc(r.name)}</h3>
                <p>${esc(r.tagline || r.address || '—')}</p>
                <span class="delivery-badge ${r.active !== false ? 'delivery-badge-accepted' : 'delivery-badge-rejected'}">
                    ${r.active !== false ? 'Ачык' : 'Жабык'}
                </span>
            </article>`).join('');
    }

    window.dOpenRestaurant = function (id) {
        const r = restaurantMap[id];
        if (!r) return;
        q('dRestModalTitle').textContent = 'Ресторан маалыматы';
        q('dRestModalBody').innerHTML = `
            <div class="delivery-detail-grid">
                <div><strong>Ресторандын аты</strong><br>${esc(r.name)}</div>
                <div><strong>Абалы</strong><br>${r.active !== false ? '🟢 Ачык' : '🔴 Жабык'}</div>
                <div><strong>Телефон</strong><br>${esc(r.phone || '—')}</div>
                <div><strong>Дарек</strong><br>${esc(r.address || '—')}</div>
                <div class="full" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
                    <button class="delivery-btn delivery-btn-sm ${r.active ? 'delivery-btn-green' : 'delivery-btn-outline'}" onclick="dToggleRest(${r.id}, ${!r.active})">${r.active ? 'Ресторанды жабуу' : 'Ресторанды ачуу'}</button>
                    <a class="delivery-btn delivery-btn-outline delivery-btn-sm" href="/kitchen/${esc(r.slug)}" target="_blank">🍳 Кухня</a>
                    <button class="delivery-btn delivery-btn-outline delivery-btn-sm" onclick="dGoReports(${r.id})">📊 Отчеттор</button>
                </div>
            </div>`;
        q('dRestModal').classList.add('open');
    };

    window.dCloseRestModal = function () { q('dRestModal').classList.remove('open'); };

    window.dGoReports = function (restId) {
        dCloseRestModal();
        dNav('reports', document.querySelector('[data-sec="reports"]'));
        q('dRepRest').value = restId;
        loadReportHistoryNav();
    };

    window.dToggleRest = async function (id, active) {
        const r = restaurantMap[id];
        if (!r) return;
        await fetch('/api/restaurants/' + id, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...r, active })
        });
        await loadRestaurants();
        renderRestaurants();
        dOpenRestaurant(id);
    };

    function initReports() {
        const sel = q('dRepRest');
        sel.innerHTML = '<option value="">Ресторан тандаңыз</option>' +
            restaurants.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
        loadReportHistoryNav();
        q('dRepRest').onchange = loadReportHistoryNav;
    }

    async function loadReportHistoryNav() {
        const rid = q('dRepRest').value;
        const years = await ReportsUI.fetchYears(rid ? rid : null);
        const nav = q('dRepHistoryNav');
        nav.innerHTML = years.map(y => `
            <span class="rep-year-label">${y}</span>
            ${AYLAR.map((m, i) => `<button type="button" class="rep-month-btn" onclick="dLoadMonthReport(${y},${i+1})">${m}</button>`).join('')}
        `).join('');
    }

    window.dLoadMonthReport = async function (year, month) {
        const rid = q('dRepRest').value;
        if (!rid) { alert('Ресторан тандаңыз'); return; }
        q('dRepResult').innerHTML = ReportsUI.renderReport(await ReportsUI.fetchMonthly(year, month, rid));
    };

    window.dLoadReport = async function () {
        const rid = q('dRepRest').value;
        if (!rid) { alert('Ресторан тандаңыз'); return; }
        try {
            const data = await ReportsUI.fetchSummary(q('dRepPreset').value, rid, q('dRepFrom').value, q('dRepTo').value);
            q('dRepResult').innerHTML = ReportsUI.renderReport(data);
        } catch (e) { q('dRepResult').innerHTML = '<div class="delivery-empty">Жүктөлбөдү</div>'; }
    };

    function populateHistRest() {
        const sel = q('dHistRest');
        if (sel.options.length > 1) return;
        sel.innerHTML = '<option value="">Бардык ресторандар</option>' +
            restaurants.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    }

    async function loadHistory() {
        const p = [];
        if (q('dHistFrom').value) p.push('from=' + q('dHistFrom').value);
        if (q('dHistTo').value) p.push('to=' + q('dHistTo').value);
        if (q('dHistRest').value) p.push('restaurantId=' + q('dHistRest').value);
        p.push('status=DELIVERED');
        try {
            const list = await fetch('/orders/history?' + p.join('&')).then(r => r.json());
            q('dHistBody').innerHTML = list.length ? list.map(o => `<tr class="delivery-order-row" onclick="dOpenOrder(${o.id})">
                <td><strong>${esc(o.displayOrderNumber || o.id)}</strong></td>
                <td>${esc(restName(o.restaurantId))}</td>
                <td>${esc(o.customerName)}</td>
                <td>${esc(o.phone)}</td>
                <td>${esc(o.itemName || '—')}</td>
                <td>${money(o.totalPrice)}</td>
                <td>${fmtTime(o.deliveredAt || o.createdAt)}</td>
                <td>${esc(o.operatorName || '—')}</td>
                <td>${o.receiptImagePath ? `<a href="${esc(o.receiptImagePath)}" target="_blank" class="delivery-hist-receipt" title="Төлөмдүн чеги" onclick="event.stopPropagation()">🧾</a>` : '—'}</td>
            </tr>`).join('') : '<tr><td colspan="9" class="delivery-empty">Жазуу жок</td></tr>';
        } catch (e) {
            q('dHistBody').innerHTML = '<tr><td colspan="9" class="delivery-empty">Жүктөлбөдү</td></tr>';
        }
    }

    window.dLoadHistory = loadHistory;

    window.dOpenOrder = async function (id) {
        const res = await fetch('/orders/' + id);
        if (!res.ok) return;
        currentOrder = await res.json();
        const num = formatOrderNumber(currentOrder);
        q('dModalTitle').textContent = 'Заказ ' + num;
        q('dModalBody').innerHTML = renderOrderDetail(currentOrder);
        const actions = q('dModalActions');
        if (currentOrder.orderStatus === 'NEW') {
            actions.style.display = 'flex';
        } else {
            actions.style.display = 'none';
        }
        q('dModal').classList.add('open');
    };

    window.dCloseModal = function () {
        q('dModal').classList.remove('open');
        currentOrder = null;
    };

    window.dAccept = async function () {
        if (!currentOrder) return;
        const btn = q('dModalActions')?.querySelector('.delivery-btn-green');
        if (btn?.disabled) return;
        if (btn) btn.disabled = true;
        try {
            const res = await fetch('/orders/' + currentOrder.id + '/accept?operator=' + encodeURIComponent(operatorName), { method: 'PUT' });
            if (res.ok) {
                dCloseModal();
                refreshDashboard();
                loadNewOrders();
                return;
            }
            let msg = 'Кабыл алуу ишке ашкан жок';
            if (res.status === 404) msg = 'Заказ табылган жок (бетти жаңыртыңыз)';
            else if (res.status === 400) msg = 'Бул заказ мурунтан кабыл алынган же жараксыз';
            else {
                try {
                    const body = await res.json();
                    if (body?.error) msg = body.error;
                } catch (e) { /* ignore */ }
            }
            alert(msg);
        } catch (e) {
            alert('Тармак катасы — кайра аракет кылыңыз');
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    window.dReject = async function () {
        if (!currentOrder || !confirm('Четке кагасызбы? Ресторан бул заказды көрбөйт.')) return;
        await fetch('/orders/' + currentOrder.id + '/cancel?operator=' + encodeURIComponent(operatorName), { method: 'PUT' });
        dCloseModal(); refreshDashboard(); loadNewOrders();
    };

    window.dSaveOperator = function () {
        operatorName = q('dOperator').value.trim() || 'Оператор';
        localStorage.setItem('ratlionOperator', operatorName);
        alert('Сакталды');
    };

    async function loadCouriers() {
        const box = q('dCourierList');
        if (!box) return;
        try {
            const list = await fetch('/api/couriers/active').then(r => r.json());
            const phoneCouriers = list.filter(c => c.phone);
            if (!phoneCouriers.length) {
                box.innerHTML = '<div class="delivery-empty">Азырынча курьер жок</div>';
                return;
            }
            box.innerHTML = phoneCouriers.map(c => {
                const tg = (c.telegramChatId && !String(c.telegramChatId).startsWith('phone:'))
                    ? c.telegramChatId : '';
                const tgBadge = tg
                    ? '<span style="font-size:11px;color:#15803d">📱 Telegram ✓</span>'
                    : '<span style="font-size:11px;color:#b45309">📱 Telegram жок</span>';
                return `<div style="padding:12px 0;border-bottom:1px solid #f1f5f9;gap:12px">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
                        <div>
                            <strong style="font-size:15px">${esc(c.name)}</strong>
                            <div style="font-size:13px;color:var(--d-muted);margin-top:3px">📞 ${esc(c.phone)}</div>
                            <div style="margin-top:4px">${tgBadge}</div>
                        </div>
                        <span style="font-size:12px;font-weight:700;color:#15803d;background:#dcfce7;padding:4px 10px;border-radius:999px;flex-shrink:0">Катталган</span>
                    </div>
                    <div class="delivery-toolbar" style="margin-top:10px;flex-wrap:wrap">
                        <input id="dCourierTg${c.id}" class="delivery-input" type="text" placeholder="Telegram chat ID" value="${esc(tg)}" style="max-width:200px">
                        <button type="button" class="delivery-btn delivery-btn-outline delivery-btn-sm" onclick="dSaveCourierTelegram(${c.id})">Telegram сактоо</button>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            box.innerHTML = '<div class="delivery-empty">Жүктөлбөдү</div>';
        }
    }

    window.dAddCourier = async function () {
        const name = q('dCourierName').value.trim();
        const phone = q('dCourierPhone').value.trim();
        if (!name || !phone) {
            alert('Аты жана телефонду жазыңыз');
            return;
        }
        const res = await fetch('/api/couriers/register-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone })
        });
        if (!res.ok) {
            alert('Катталбай калды — бул телефон бар болушу мүмкүн');
            return;
        }
        const saved = await res.json();
        q('dCourierName').value = '';
        q('dCourierPhone').value = '';
        alert('✅ ' + saved.name + ' катталды');
        loadCouriers();
        loadCourierActivity();
    };

    window.dSaveCourierTelegram = async function (id) {
        const input = q('dCourierTg' + id);
        if (!input) return;
        const chatId = input.value.trim();
        const res = await fetch('/api/couriers/' + id + '/telegram', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramChatId: chatId })
        });
        const data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            alert(data.error || 'Сактоо ишке ашкан жок');
            return;
        }
        toast('Telegram сакталды: ' + (data.name || 'курьер'));
        loadCouriers();
    };

    function courierActivityBadgeClass(status) {
        const map = {
            FREE: 'courier-act-free',
            OFFER: 'courier-act-offer',
            WAITING: 'courier-act-waiting',
            PICKUP: 'courier-act-pickup',
            DELIVERING: 'courier-act-delivering'
        };
        return map[status] || 'courier-act-free';
    }

    function renderCourierSteps(steps) {
        if (!steps || !steps.length) return '';
        return `<div class="courier-act-steps">${steps.map((s, i) => {
            const cls = [s.done ? 'done' : '', s.current ? 'current' : ''].filter(Boolean).join(' ');
            return `<div class="courier-act-step ${cls}">
                ${i < steps.length - 1 ? '<span class="courier-act-step-line"></span>' : ''}
                <div class="courier-act-step-dot"></div>
                <div class="courier-act-step-label">${esc(s.label)}</div>
            </div>`;
        }).join('')}</div>`;
    }

    function renderCourierActivityCard(c) {
        const orders = c.activeOrders || [];
        const history = c.recentHistory || [];
        const ordersHtml = orders.length
            ? orders.map(o => `<div class="courier-act-order">
                <div class="courier-act-order-num">📦 ${esc(o.displayOrderNumber || '#' + o.id)} · ${esc(statusLabel(o.orderStatus))}</div>
                <div class="courier-act-order-addr">${esc(o.customerName || '')}${o.address ? ' — ' + esc(o.address) : ''}</div>
                <div class="courier-act-order-times">
                    ${o.acceptedAt ? `<span>Кабыл: ${fmtTime(o.acceptedAt)}</span>` : ''}
                    ${o.readyAt ? `<span>Даяр: ${fmtTime(o.readyAt)}</span>` : ''}
                    ${o.courierAt ? `<span>Алды: ${fmtTime(o.courierAt)}</span>` : ''}
                </div>
                ${renderCourierSteps(o.steps)}
            </div>`).join('')
            : (c.activityStatus === 'OFFER'
                ? '<div class="courier-act-order" style="background:#f5f3ff;border-color:#ddd6fe">Жаңы заказ сунушу күтүлүүдө</div>'
                : '<div style="font-size:13px;color:var(--d-muted);margin-top:6px">Активдүү заказ жок</div>');

        const historyHtml = history.length
            ? `<details class="courier-act-history">
                <summary>Тарых (${history.length})</summary>
                <div class="courier-act-history-list">
                    ${history.map(h => `<div class="courier-act-history-row">
                        <strong>${esc(h.displayOrderNumber || '#' + h.orderId)}</strong>
                        <span>${esc(h.customerName || '')}</span>
                        <span class="courier-act-history-time">${fmtTime(h.deliveredAt)}</span>
                    </div>`).join('')}
                </div>
            </details>`
            : '';

        return `<div class="courier-act-card">
            <div class="courier-act-head">
                <div>
                    <div class="courier-act-name">${esc(c.name)}</div>
                    <div class="courier-act-meta">📞 ${esc(c.phone)} · Бүгүн: ${c.todayDelivered || 0} жеткирүү</div>
                </div>
                <span class="courier-act-badge ${courierActivityBadgeClass(c.activityStatus)}">${esc(c.activityLabel)}</span>
            </div>
            ${ordersHtml}
            ${historyHtml}
        </div>`;
    }

    function renderAssignmentsTable(assignments) {
        if (!assignments.length) {
            return '<div class="delivery-empty" style="margin:0">Учурда эч ким заказ алган жок</div>';
        }
        return `<div class="courier-act-table-wrap"><table class="courier-act-table">
            <thead><tr>
                <th>Курьер</th><th>Заказ</th><th>Статус</th><th>Кардар</th><th>Кабыл</th><th>Алды</th>
            </tr></thead>
            <tbody>${assignments.map(a => `<tr>
                <td><strong>${esc(a.courierName)}</strong><div class="courier-act-td-sub">${esc(a.courierPhone || '')}</div></td>
                <td><strong>${esc(a.displayOrderNumber || '#' + a.id)}</strong></td>
                <td><span class="delivery-badge ${statusBadgeClass(a.orderStatus)}">${esc(statusLabel(a.orderStatus))}</span></td>
                <td>${esc(a.customerName || '—')}<div class="courier-act-td-sub">${esc(a.address || '')}</div></td>
                <td>${fmtTime(a.acceptedAt)}</td>
                <td>${fmtTime(a.courierAt)}</td>
            </tr>`).join('')}</tbody>
        </table></div>`;
    }

    function renderHistoryTable(history) {
        if (!history.length) {
            return '<div class="delivery-empty" style="margin:0">Тарых азырынча бош</div>';
        }
        return `<div class="courier-act-table-wrap"><table class="courier-act-table">
            <thead><tr>
                <th>Курьер</th><th>Заказ</th><th>Кардар</th><th>Дарек</th><th>Сумма</th><th>Берилди</th>
            </tr></thead>
            <tbody>${history.map(h => `<tr>
                <td><strong>${esc(h.courierName)}</strong></td>
                <td><strong>${esc(h.displayOrderNumber || '#' + h.orderId)}</strong></td>
                <td>${esc(h.customerName || '—')}</td>
                <td class="courier-act-addr">${esc(h.address || '—')}</td>
                <td>${money(h.totalPrice)} с</td>
                <td>${fmtTime(h.deliveredAt)}</td>
            </tr>`).join('')}</tbody>
        </table></div>`;
    }

    async function loadCourierActivity() {
        const box = q('dCourierActivity');
        const updated = q('dCourierActivityUpdated');
        if (!box) return;
        try {
            const data = await fetch('/api/couriers/activity').then(r => r.json());
            const couriers = data.couriers || [];
            const feed = data.feed || [];
            const assignments = data.assignments || [];
            const history = data.history || [];

            if (!couriers.length) {
                box.innerHTML = '<div class="delivery-empty">Курьерлер жок — алгач каттаңыз</div>';
            } else {
                const cards = `<div class="courier-act-grid">${couriers.map(renderCourierActivityCard).join('')}</div>`;
                const assignTable = `<div class="courier-act-section">
                    <div class="courier-act-feed-title">📋 Кайсы курьер — кайсы заказ</div>
                    ${renderAssignmentsTable(assignments)}
                </div>`;
                const histTable = `<div class="courier-act-section">
                    <div class="courier-act-feed-title">📜 Жеткирүү тарыхы</div>
                    ${renderHistoryTable(history)}
                </div>`;
                const feedHtml = feed.length
                    ? `<div class="courier-act-feed">
                        <div class="courier-act-feed-title">Акыркы окуялар</div>
                        ${feed.slice(0, 12).map(ev => `<div class="courier-act-feed-item">
                            <span class="courier-act-feed-time">${fmtTime(ev.at)}</span>
                            <span><strong>${esc(ev.courierName)}</strong> — ${esc(ev.text || ev.type || '')}</span>
                        </div>`).join('')}
                    </div>`
                    : '';
                box.innerHTML = cards + assignTable + histTable + feedHtml;
            }

            if (updated) {
                updated.textContent = data.updatedAt
                    ? 'Жаңыртылды: ' + fmtTime(data.updatedAt)
                    : '—';
            }
        } catch (e) {
            if (box.innerHTML.indexOf('courier-act') < 0) {
                box.innerHTML = '<div class="delivery-empty">Кыймыл жүктөлбөдү</div>';
            }
        }
    }

    window.dLoadCouriers = loadCouriers;
    window.dLoadCourierActivity = loadCourierActivity;

    init();
})();
