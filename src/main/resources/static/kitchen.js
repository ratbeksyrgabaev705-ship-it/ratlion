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
    let activeCategory = '';
    let pollTimer = null;
    let prevOrderStatus = {};
    let pendingFly = null;
    let knownOrderIds = new Set();

    function q(id) { return document.getElementById(id); }
    function rid() { return scopeId ? '?restaurantId=' + encodeURIComponent(scopeId) : ''; }
    function money(v) { return Number(v || 0).toLocaleString('ky-KG', { maximumFractionDigits: 0 }); }
    function esc(v) {
        return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
        loadRestaurant().then(() => {
            refreshOrders();
        });
        pollTimer = setInterval(refreshOrders, 8000);
        window.addEventListener('hashchange', handleHash);
        handleHash();
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
            allOrders = await res.json();
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
            ${o.comment ? `<div class="kitchen-order-meta">💬 ${esc(o.comment)}</div>` : ''}
            <div class="kitchen-order-items">${esc(o.itemName)}</div>
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
            }
        } catch (e) { /* silent */ }
    }

    init();
})();
