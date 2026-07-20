(function () {
    const K = window.KITCHEN || {};
    let scopeId = K.id != null ? Number(K.id) : null;
    let scopeSlug = K.slug || null;
    let scopeName = K.name || 'Ресторан';
    let restaurantData = null;
    let allOrders = [];
    let menuItems = [];
    let editingMenuId = null;
    let menuImageFile = null;
    let menuSaving = false;
    let activeCategory = '';
    let pollTimer = null;
    let prevOrderStatus = {};
    let pendingFly = null;
    let knownOrderIds = new Set();
    let ordersBootstrapped = false;
    let notifiedOrderIds = new Set();
    let pushEnabled = localStorage.getItem('kitchenPush') !== 'false';

    function q(id) { return document.getElementById(id); }
    function rid() { return scopeId ? '?restaurantId=' + encodeURIComponent(scopeId) : ''; }
    function money(v) { return Number(v || 0).toLocaleString('ky-KG', { maximumFractionDigits: 0 }); }
    function esc(v) {
        return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function formatOrderItems(itemName) {
        if (!itemName || !String(itemName).trim()) {
            return '<ul class="kitchen-order-items-list"><li>—</li></ul>';
        }
        const parts = String(itemName).split(',').map(s => s.trim()).filter(Boolean);
        if (!parts.length) {
            return '<ul class="kitchen-order-items-list"><li>—</li></ul>';
        }
        return '<ul class="kitchen-order-items-list">' +
            parts.map(part => `<li>${esc(part)}</li>`).join('') +
            '</ul>';
    }
    function fmtTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('ky-KG', { hour: '2-digit', minute: '2-digit' });
    }
    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    function customerUrl() {
        return '/' + encodeURIComponent(scopeSlug || '');
    }
    function toast(msg) {
        const el = q('kToast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2800);
    }

    function getSlugFromUrl() {
        const params = new URLSearchParams(location.search);
        if (params.get('slug')) return params.get('slug');
        const kitchenMatch = location.pathname.match(/^\/kitchen\/([^/?#]+)/i);
        if (kitchenMatch) return decodeURIComponent(kitchenMatch[1]);
        const match = location.pathname.match(/^\/restaurant\/([^/?#]+)/i);
        return match ? decodeURIComponent(match[1]) : null;
    }

    async function resolveBySlug(slug) {
        if (!slug) return false;
        try {
            const res = await fetch('/api/restaurants/by-slug/' + encodeURIComponent(slug));
            if (!res.ok) return false;
            const r = await res.json();
            scopeId = r.id;
            scopeSlug = r.slug;
            scopeName = r.name;
            restaurantData = r;
            K.emoji = r.emoji;
            K.color = r.accentColor;
            K.logo = r.logoUrl;
            return true;
        } catch (e) {
            return false;
        }
    }

    function showNotFound(slug) {
        q('kPick').style.display = 'none';
        q('kLayout').style.display = 'none';
        const nf = q('kNotFound');
        if (nf) {
            nf.style.display = 'flex';
            const msg = q('kNotFoundMsg');
            if (msg && slug) msg.textContent = '«' + slug + '» аттуу ресторан маалымат базасында табылган жок.';
        }
    }

    async function init() {
        if (K.notFound) {
            showNotFound(K.requestedSlug || getSlugFromUrl());
            return;
        }

        const urlSlug = getSlugFromUrl();
        if (!scopeId && (K.slug || urlSlug)) {
            const ok = await resolveBySlug(K.slug || urlSlug);
            if (!ok && (K.slug || urlSlug)) {
                showNotFound(K.slug || urlSlug);
                return;
            }
        }

        if (scopeId) {
            startPanel();
        } else {
            loadPicker();
        }
    }

    function startPanel() {
        applyBrand();
        showApp();
        bindMenuForm();
        bindPushControls();
        loadRestaurant().then(() => {
            refreshOrders();
        });
        pollTimer = setInterval(refreshOrders, 8000);
        window.addEventListener('hashchange', handleHash);
        handleHash();
    }

    function bindPushControls() {
        const btn = q('kPushBtn');
        if (btn) btn.addEventListener('click', requestPushPermission);
        updatePushUi();
    }

    function updatePushUi() {
        const btn = q('kPushBtn');
        const status = q('kPushStatus');
        if (!btn || !status) return;
        if (!('Notification' in window)) {
            btn.style.display = 'none';
            status.textContent = 'Браузер push колдобойт';
            return;
        }
        if (Notification.permission === 'granted' && pushEnabled) {
            btn.textContent = '🔔 Эскертүү күйгүзүлгөн';
            btn.classList.add('kitchen-push-on');
            status.textContent = 'Жаңы заказ келсе үн + эскертүү';
        } else if (Notification.permission === 'denied') {
            btn.textContent = '🔕 Уруксат жок';
            btn.classList.remove('kitchen-push-on');
            status.textContent = 'Браузер жөндөмдөрүнөн уруксат бериңиз';
        } else {
            btn.textContent = '🔔 Эскертүүнү күйгүзүү';
            btn.classList.remove('kitchen-push-on');
            status.textContent = 'Жаңы заказ келгенде билесиз';
        }
    }

    async function requestPushPermission() {
        if (!('Notification' in window)) {
            toast('Браузер push колдобойт');
            return;
        }
        if (Notification.permission === 'granted') {
            pushEnabled = true;
            localStorage.setItem('kitchenPush', 'true');
            updatePushUi();
            toast('Эскертүү күйгүзүлдү');
            return;
        }
        if (Notification.permission === 'denied') {
            toast('Браузер жөндөмдөрүнөн уруксат бериңиз');
            return;
        }
        const perm = await Notification.requestPermission();
        pushEnabled = perm === 'granted';
        localStorage.setItem('kitchenPush', pushEnabled ? 'true' : 'false');
        updatePushUi();
        if (pushEnabled) {
            unlockAudio();
            toast('Эскертүү күйгүзүлдү!');
        }
    }

    let audioCtx = null;
    function unlockAudio() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { /* ignore */ }
    }

    function playNewOrderSound() {
        try {
            unlockAudio();
            const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            audioCtx = ctx;
            [880, 1100, 880].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.18);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.22);
                osc.start(ctx.currentTime + i * 0.18);
                osc.stop(ctx.currentTime + i * 0.18 + 0.28);
            });
        } catch (e) { /* audio blocked */ }
    }

    function showOrderPush(order) {
        if (!pushEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
        const num = order.displayOrderNumber || '#' + order.id;
        const body = (order.customerName || 'Кардар') + ' · ' + money(order.totalPrice) + ' сом';
        try {
            const n = new Notification('🆕 Жаңы заказ — ' + scopeName, {
                body: num + ' — ' + body,
                tag: 'order-' + order.id,
                renotify: true
            });
            n.onclick = () => { window.focus(); n.close(); };
        } catch (e) { /* ignore */ }
    }

    function notifyNewOrders(incoming) {
        if (!incoming.length) return;
        playNewOrderSound();
        incoming.forEach(o => showOrderPush(o));
        const first = incoming[0];
        toast('🆕 Жаңы заказ: ' + (first.displayOrderNumber || '#' + first.id));
    }

    function applyBrand() {
        const logoEl = q('kBrandLogo');
        const emojiEl = q('kBrandEmoji');
        const logoUrl = (restaurantData && restaurantData.logoUrl) || K.logo;

        if (logoUrl && logoEl) {
            logoEl.src = logoUrl;
            logoEl.style.display = 'block';
            if (emojiEl) emojiEl.style.display = 'none';
        } else {
            if (logoEl) logoEl.style.display = 'none';
            if (emojiEl) {
                emojiEl.style.display = 'block';
                emojiEl.textContent = K.emoji || '🏪';
            }
        }

        q('kBrandName').textContent = scopeName;
        q('kBrandSub').textContent = 'Ресторан панели';
        document.title = scopeName + ' — Ресторан панели';
        if (K.color || (restaurantData && restaurantData.accentColor)) {
            document.documentElement.style.setProperty('--k-accent', restaurantData?.accentColor || K.color);
        }
    }

    async function loadPicker() {
        q('kPick').style.display = 'flex';
        try {
            const res = await fetch('/api/restaurants/public');
            const list = await res.json();
            q('kRestList').innerHTML = list.map(r =>
                `<a class="kitchen-rest-link" href="/kitchen/${encodeURIComponent(r.slug)}">${r.emoji || '🏪'} ${esc(r.name)}</a>`
            ).join('') || '<p style="color:#94a3b8">Ресторан жок</p>';
        } catch (e) {
            q('kRestList').innerHTML = '<p style="color:#94a3b8">Жүктөлбөдү</p>';
        }
    }

    function showApp() {
        q('kPick').style.display = 'none';
        if (q('kNotFound')) q('kNotFound').style.display = 'none';
        q('kLayout').style.display = 'flex';
    }

    window.kNav = function (section, btn) {
        document.querySelectorAll('.kitchen-nav-item').forEach(n => n.classList.remove('active'));
        if (btn) btn.classList.add('active');
        document.querySelectorAll('.kitchen-section').forEach(s => s.classList.remove('active'));
        const sec = q('sec-' + section);
        if (sec) sec.classList.add('active');
        location.hash = section;
        if (section === 'orders') renderOrderSections();
        if (section === 'menu') loadMenu();
        if (section === 'reports') loadReports();
    };

    function handleHash() {
        let h = (location.hash || '#orders').replace('#', '');
        if (h === 'dashboard' || h === 'settings') h = 'orders';
        if (h === 'new-orders' || h === 'cooking' || h === 'ready') h = 'orders';
        const btn = document.querySelector(`.kitchen-nav-item[data-sec="${h}"]`);
        if (btn) kNav(h, btn);
        else kNav('orders', document.querySelector('.kitchen-nav-item[data-sec="orders"]'));
    }

    async function refreshOrders() {
        if (!scopeId) return;
        try {
            const res = await fetch('/orders/cafe' + rid());
            const fresh = await res.json();
            const incoming = fresh.filter(o =>
                o.orderStatus === 'ACCEPTED' && !notifiedOrderIds.has(o.id)
            );
            if (ordersBootstrapped && incoming.length) {
                notifyNewOrders(incoming);
            }
            incoming.forEach(o => notifiedOrderIds.add(o.id));
            fresh.forEach(o => knownOrderIds.add(o.id));
            if (!ordersBootstrapped) ordersBootstrapped = true;
            allOrders = fresh;
            renderOrderSections();
        } catch (e) { /* silent */ }
    }

    window.kRefreshOrders = refreshOrders;

    function renderOrderSections() {
        const buckets = { new: [], cooking: [], ready: [] };
        const moved = { new: new Set(), cooking: new Set(), ready: new Set() };

        allOrders.forEach(o => {
            const prev = prevOrderStatus[o.id];
            if (o.orderStatus === 'ACCEPTED') {
                buckets.new.push(o);
                if (prev && prev !== 'ACCEPTED') moved.new.add(o.id);
            } else if (o.orderStatus === 'COOKING') {
                buckets.cooking.push(o);
                if (prev && prev !== 'COOKING') moved.cooking.add(o.id);
            } else if (o.orderStatus === 'READY') {
                buckets.ready.push(o);
                if (prev && prev !== 'READY') moved.ready.add(o.id);
            }
            prevOrderStatus[o.id] = o.orderStatus;
        });

        if (pendingFly) {
            if (pendingFly.ep === 'cook') moved.cooking.add(pendingFly.id);
            else if (pendingFly.ep === 'ready') moved.ready.add(pendingFly.id);
        }

        updateCount('kCountNew', buckets.new.length);
        updateCount('kCountCooking', buckets.cooking.length);
        updateCount('kCountReady', buckets.ready.length);

        renderCol('kColNew', buckets.new, 'new', moved.new);
        renderCol('kColCooking', buckets.cooking, 'cooking', moved.cooking);
        renderCol('kColReady', buckets.ready, 'ready', moved.ready);

        pendingFly = null;
    }

    function updateCount(countId, count) {
        const countEl = q(countId);
        if (countEl) {
            const prev = Number(countEl.textContent || 0);
            countEl.textContent = count;
            if (prev !== count) {
                const col = countEl.closest('.kitchen-col');
                if (col) {
                    col.classList.remove('kitchen-col--pulse');
                    void col.offsetWidth;
                    col.classList.add('kitchen-col--pulse');
                }
            }
        }
    }

    function renderCol(elId, orders, type, movedIds) {
        const el = q(elId);
        if (!el) return;
        if (!orders.length) {
            el.innerHTML = '<div class="kitchen-empty">Заказ жок</div>';
            return;
        }
        el.innerHTML = orders.map(o => {
            const isFresh = !knownOrderIds.has(o.id);
            knownOrderIds.add(o.id);
            const isMoved = movedIds && movedIds.has(o.id);
            return cardHtml(o, type, isFresh, isMoved);
        }).join('');
    }

    function cardHtml(o, type, isFresh, isMoved) {
        let btn = '';
        if (type === 'new') btn = `<button class="kitchen-btn kitchen-btn-primary kitchen-btn-sm" onclick="kAction(${o.id},'cook')">🍳 Даярдоону баштоо</button>`;
        if (type === 'cooking') btn = `<button class="kitchen-btn kitchen-btn-primary kitchen-btn-sm" onclick="kAction(${o.id},'ready')">✅ Даяр</button>`;
        if (type === 'ready') btn = `<button class="kitchen-btn kitchen-btn-outline kitchen-btn-sm" onclick="kAction(${o.id},'courier')">🛵 Курьерге берүү</button>`;
        const waitNote = type === 'ready' ? '<div class="kitchen-order-meta">⏳ Курьер күтүлүүдө</div>' : '';
        let enterCls = '';
        if (isMoved) enterCls = ` kitchen-order-card--enter-${type}`;
        else if (isFresh) enterCls = ' kitchen-order-card--fresh';
        return `<article class="kitchen-order-card${enterCls}" data-order-id="${o.id}">
            <div class="kitchen-order-num">${esc(o.displayOrderNumber || '#' + o.id)}</div>
            <div class="kitchen-order-meta">👤 ${esc(o.customerName)}</div>
            ${o.foodComment ? `<div class="kitchen-order-meta">🍽 ${esc(o.foodComment)}</div>` : ''}
            ${formatOrderItems(o.itemName)}
            <div class="kitchen-order-time">🕐 ${fmtTime(o.createdAt)} · ${money(o.totalPrice)} сом</div>
            ${waitNote}
            ${btn}
        </article>`;
    }

    window.kAction = async function (id, ep) {
        const card = document.querySelector(`.kitchen-order-card[data-order-id="${id}"]`);
        if (card) {
            card.classList.add('kitchen-order-card--fly-out');
            pendingFly = { id, ep };
            await new Promise(r => setTimeout(r, 360));
        }
        const res = await fetch('/orders/' + id + '/' + ep, { method: 'PUT' });
        if (res.ok) {
            await refreshOrders();
            if (ep === 'cook') toast('Даярдалууда');
            else if (ep === 'ready') toast('Даяр болду');
            else if (ep === 'courier') toast('Курьерге берилди');
        } else {
            pendingFly = null;
            toast('Ишке ашкан жок');
        }
    };

    async function loadReports() {
        if (!scopeId) return;
        await kLoadReports();
    }

    window.kLoadReports = async function () {
        if (!scopeId) return;
        const preset = q('kRepPreset')?.value || 'today';
        try {
            const data = await ReportsUI.fetchSummary(preset, scopeId, null, null);
            const el = q('kRepResult');
            if (el) el.innerHTML = ReportsUI.renderReport(data);
        } catch (e) {
            if (q('kRepResult')) q('kRepResult').innerHTML = '<div class="kitchen-empty">Жүктөлбөдү</div>';
        }
    };

    /* ===== Menu Management ===== */
    async function loadMenu() {
        if (!scopeId) return;
        try {
            const res = await fetch('/menu' + rid());
            menuItems = await res.json();
            renderMenuList();
        } catch (e) { toast('Меню жүктөлбөдү'); }
    }

    function menuName(item) { return item.nameKg || item.name || item.nameRu || '—'; }
    function menuCategory(item) { return item.categoryKg || item.category || item.categoryRu || '—'; }
    function menuDesc(item) { return item.descriptionKg || item.description || item.descriptionRu || ''; }

    function renderCategoryFilters(list) {
        const el = q('kMenuCategories');
        if (!el) return;
        const cats = [...new Set(list.map(menuCategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ky'));
        el.innerHTML = `<button type="button" class="k-cat-btn${activeCategory === '' ? ' active' : ''}" onclick="kFilterCategory('')">Бардыгы (${list.length})</button>` +
            cats.map(c => {
                const count = list.filter(i => menuCategory(i) === c).length;
                const active = activeCategory === c ? ' active' : '';
                return `<button type="button" class="k-cat-btn${active}" onclick="kFilterCategory(${JSON.stringify(c)})">${esc(c)} (${count})</button>`;
            }).join('');
    }

    window.kFilterCategory = function (cat) {
        activeCategory = cat || '';
        renderMenuList();
    };

    function renderMenuList() {
        const searchEl = q('kMenuSearch');
        const search = (searchEl?.value || '').trim().toLowerCase();
        let list = menuItems.slice();
        if (search) {
            list = list.filter(i => [i.nameKg, i.nameRu, i.name, i.categoryKg, i.category].join(' ').toLowerCase().includes(search));
        }
        if (activeCategory) {
            list = list.filter(i => menuCategory(i) === activeCategory);
        }
        renderCategoryFilters(menuItems);
        const el = q('kMenuList');
        if (!list.length) {
            el.innerHTML = '<div class="adm-empty">Тамак жок</div>';
            return;
        }
        el.innerHTML = list.map(item => {
            const avail = item.available !== false;
            const img = item.image
                ? `<img src="${esc(item.image)}" alt="">`
                : '<div class="adm-menu-ph">🍽</div>';
            return `<article class="adm-menu-item">
                ${img}
                <div>
                    <strong style="font-size:16px">${esc(menuName(item))}</strong>
                    <div style="font-size:12px;color:var(--adm-muted);margin-top:4px">${esc(menuCategory(item))}</div>
                    <div style="font-size:13px;margin-top:6px;color:var(--adm-muted)">${esc(menuDesc(item).slice(0, 80))}</div>
                    <div style="font-size:18px;font-weight:800;color:var(--adm-green-dark);margin-top:8px">${money(item.price)} сом</div>
                    <span class="adm-badge ${avail ? 'adm-badge-delivered' : 'adm-badge-cancelled'}" style="margin-top:8px">${avail ? 'Көрүнөт' : 'Жашырылган'}</span>
                </div>
                <div class="adm-menu-actions">
                    <button class="adm-btn adm-btn-outline adm-btn-sm" onclick="kEditMenu(${item.id})">Түзөтүү</button>
                    <button class="adm-btn adm-btn-outline adm-btn-sm" onclick="kToggleMenu(${item.id}, ${avail})">${avail ? 'Жашыруу' : 'Көрсөтүү'}</button>
                    <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="kDeleteMenu(${item.id})">Өчүрүү</button>
                </div>
            </article>`;
        }).join('');
    }

    window.kFilterMenu = renderMenuList;

    window.kOpenMenuForm = function (editId) {
        editingMenuId = editId || null;
        menuImageFile = null;
        q('kMenuModalTitle').textContent = editId ? 'Тамакты түзөтүү' : 'Жаңы тамак';
        q('kMenuForm').reset();
        q('kmfImgPreview').classList.remove('show');
        if (editId) {
            const item = menuItems.find(m => m.id === editId);
            if (item) fillMenuForm(item);
        }
        q('kMenuModal').classList.add('open');
    };

    window.kEditMenu = function (id) { kOpenMenuForm(id); };

    function fillMenuForm(item) {
        q('kmfName').value = item.nameKg || item.name || '';
        q('kmfCategory').value = item.categoryKg || item.category || '';
        q('kmfDesc').value = item.descriptionKg || item.description || '';
        q('kmfPrice').value = item.price || '';
        q('kmfNameRu').value = item.nameRu || '';
        q('kmfCategoryRu').value = item.categoryRu || '';
        q('kmfDescRu').value = item.descriptionRu || '';
        q('kmfIngredients').value = item.ingredientsKg || item.ingredients || '';
        if (item.image) {
            q('kmfImgPreview').querySelector('img').src = item.image;
            q('kmfImgPreview').classList.add('show');
        }
    }

    window.kCloseMenuModal = function () {
        q('kMenuModal').classList.remove('open');
        editingMenuId = null;
        menuImageFile = null;
    };

    function bindMenuForm() {
        const imgInput = q('kmfImgInput');
        if (imgInput) {
            imgInput.addEventListener('change', function () {
                const file = this.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) { toast('Сүрөт тандаңыз'); return; }
                menuImageFile = file;
                const reader = new FileReader();
                reader.onload = e => {
                    q('kmfImgPreview').querySelector('img').src = e.target.result;
                    q('kmfImgPreview').classList.add('show');
                };
                reader.readAsDataURL(file);
            });
        }
        const form = q('kMenuForm');
        if (form) form.addEventListener('submit', async e => { e.preventDefault(); await saveMenuItem(); });
    }

    async function saveMenuItem() {
        if (menuSaving) return;
        const payload = {
            nameKg: q('kmfName').value.trim(),
            nameRu: q('kmfNameRu').value.trim() || q('kmfName').value.trim(),
            categoryKg: q('kmfCategory').value.trim(),
            categoryRu: q('kmfCategoryRu').value.trim() || q('kmfCategory').value.trim(),
            descriptionKg: q('kmfDesc').value.trim(),
            descriptionRu: q('kmfDescRu').value.trim(),
            ingredientsKg: q('kmfIngredients').value.trim(),
            ingredientsRu: q('kmfIngredients').value.trim(),
            price: Number(q('kmfPrice').value),
            restaurantId: scopeId,
            available: true
        };
        if (!payload.nameKg || !payload.categoryKg || payload.price <= 0) {
            toast('Минималдуу талааларды толтуруңуз');
            return;
        }
        menuSaving = true;
        const submitBtn = q('kMenuForm')?.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
            if (editingMenuId && !menuImageFile) {
                const item = menuItems.find(m => m.id === editingMenuId);
                const body = {
                    name: payload.nameKg, nameKg: payload.nameKg, nameRu: payload.nameRu,
                    category: payload.categoryKg, categoryKg: payload.categoryKg, categoryRu: payload.categoryRu,
                    description: payload.descriptionKg, descriptionKg: payload.descriptionKg, descriptionRu: payload.descriptionRu,
                    ingredients: payload.ingredientsKg, ingredientsKg: payload.ingredientsKg, ingredientsRu: payload.ingredientsRu,
                    price: payload.price, image: item ? item.image : '', available: item ? item.available : true
                };
                const res = await fetch('/menu/' + editingMenuId, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                });
                if (!res.ok) throw new Error('save failed');
            } else if (editingMenuId && menuImageFile) {
                const oldId = editingMenuId;
                await createMenuMultipart(payload);
                await fetch('/menu/' + oldId, { method: 'DELETE' });
            } else {
                if (!menuImageFile) { toast('Сүрөт тандаңыз'); return; }
                await createMenuMultipart(payload);
            }
            toast('Сакталды');
            kCloseMenuModal();
            loadMenu();
        } catch (e) {
            toast('Сактоо ишке ашкан жок');
        } finally {
            menuSaving = false;
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function createMenuMultipart(payload) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
        fd.append('spicyLevel', '0');
        fd.append('image', menuImageFile);
        const res = await fetch('/menu', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('upload failed');
        return res.json();
    }

    window.kToggleMenu = async function (id, currentlyAvailable) {
        if (!confirm(currentlyAvailable ? 'Жашырууну каалайсызбы?' : 'Кайра көрсөтүүнү каалайсызбы?')) return;
        const res = await fetch('/menu/' + id + '/availability?available=' + (!currentlyAvailable), { method: 'PUT' });
        if (res.ok) { toast('Статус өзгөрдү'); loadMenu(); }
    };

    window.kDeleteMenu = async function (id) {
        if (!confirm('Өчүрүүгө ишенесизби?')) return;
        const res = await fetch('/menu/' + id, { method: 'DELETE' });
        if (res.ok) { toast('Өчүрүлдү'); loadMenu(); }
    };

    /* ===== Restaurant Settings ===== */
    async function loadRestaurant() {
        if (!scopeId) return;
        try {
            const res = await fetch('/api/restaurants/' + scopeId);
            if (res.ok) {
                restaurantData = await res.json();
                scopeName = restaurantData.name || scopeName;
                scopeSlug = restaurantData.slug || scopeSlug;
                applyBrand();
                const tgInput = q('kTelegramChatId');
                if (tgInput) tgInput.value = restaurantData.telegramChatId || '';
            }
        } catch (e) { /* silent */ }
    }

    window.kSaveTelegram = async function () {
        if (!scopeId || !restaurantData) return;
        const chatId = (q('kTelegramChatId')?.value || '').trim();
        try {
            const res = await fetch('/api/restaurants/' + scopeId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...restaurantData, telegramChatId: chatId })
            });
            const data = await res.json().catch(function () { return {}; });
            if (!res.ok) throw new Error('save failed');
            restaurantData = data;
            if (data.telegramSent === false) {
                alert('⚠️ ID сакталды, бирок Telegram\'га жиберилбedi!\n\n' + (data.telegramError || '')
                    + '\n\nGetIDs Botтон ЖАНЫ ID ал (supergroup -100...)');
            } else if (data.telegramSent === true) {
                alert('✅ Telegram сакталды — тест билдирүү группага келди');
            } else {
                toast(chatId ? 'Telegram сакталды' : 'Telegram өчүрүлдү');
            }
        } catch (e) {
            toast('Сактоо ишке ашкан жок');
        }
    };

    window.kTestTelegram = async function () {
        if (!scopeId) return;
        try {
            const res = await fetch('/api/restaurants/' + scopeId + '/telegram/test', { method: 'POST' });
            const data = await res.json().catch(function () { return {}; });
            if (!res.ok) {
                alert(data.error || 'Тест ишке ашкан жок');
                return;
            }
            if (data.telegramSent) {
                alert('✅ Тест билдирүү группага жиберилди');
            } else {
                alert('❌ Telegram\'га жиберилбedi\n\n' + (data.telegramError || ''));
            }
        } catch (e) {
            alert('Тест ишке ашкан жок');
        }
    };

    init();
})();
