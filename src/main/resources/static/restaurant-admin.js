(function () {
    const ADMIN = window.ADMIN || {};
    let scopeId = ADMIN.id || null;
    let scopeSlug = ADMIN.slug || null;
    let scopeName = ADMIN.name || 'Admin';
    let allOrders = [];
    let menuItems = [];
    let editingMenuId = null;
    let menuImageFile = null;
    let reportData = null;
    let lastReportType = 'daily';
    let currentLang = localStorage.getItem('adminLanguage') || 'ky';

    const T = {
        ky: {
            pickTitle: '🏪 Ресторан админ панели',
            pickSub: 'Ресторан тандаңыз — заказдар, ашкана, меню жана отчёттор бир панelde',
            brandSub: 'Админ панели',
            navDashboard: 'Башкы бет',
            navOrders: 'Заказдар',
            navKitchen: 'Ашкана экраны',
            navMenu: 'Меню башкаруу',
            navReports: 'Отчёттор',
            linkRatlion: '🧾 RATLION (борбордук)',
            linkCafe: '🍳 Ашкана (толук)',
            linkCustomer: '🌐 Кардар сайты',
            linkPlatform: '⚙️ Платформа',
            dashTitle: 'Башкы бет',
            dashSub: 'Бүгүнкү көрсөткүчтөр',
            cardRevenue: 'Бүгүнкү киреше',
            cardTodayOrders: 'Бүгүнкү заказдар',
            cardCooking: 'Даярдалып жатат',
            cardReady: 'Даяр заказдар',
            cardDelivered: 'Жеткирилген',
            ordersTitle: 'Заказдар',
            ordersSub: 'RATLION кабыл алган заказдар гана (төлөм текшерүү жок)',
            ordersList: 'Заказдар тизмеси',
            kitchenTitle: 'Ашкана экраны',
            kitchenSub: 'Даярдоо статустарын башкаруу',
            menuTitle: 'Меню башкаруу',
            menuSub: 'Тамак кошуу, түзөтүү, жашыруу',
            menuListTitle: 'Меню',
            reportsTitle: 'Отчёттор',
            reportsSub: 'Күнүмдük, кечки жана айлык отчёттор',
            reportParams: 'Отчёт параметрлери',
            search: 'Издөө...',
            refresh: 'Жаңыртуу',
            loading: 'Жүктөлүүдө...',
            newFood: 'Жаңы тамак',
            editFood: 'Тамакты түзөтүү',
            colNo: '№',
            colCustomer: 'Кардар',
            colPhone: 'Телефон',
            colFood: 'Тамактар',
            colSum: 'Сумма',
            colStatus: 'Статус',
            colTime: 'Убакыт',
            colQty: 'Саны',
            showReport: 'Көрсөт',
            print: 'Басып чыгаруу',
            save: 'Сактоо',
            cancel: 'Жокко чыгар',
            lblNameKg: 'Аты (KG) *',
            lblNameRu: 'Аты (RU)',
            lblCatKg: 'Категория (KG) *',
            lblCatRu: 'Категория (RU)',
            lblDescKg: 'Сүрөттөмө (KG)',
            lblDescRu: 'Сүрөттөмө (RU)',
            lblIngredients: 'Курамы',
            lblPrice: 'Баасы, сом *',
            lblImage: 'Сүрөт *',
            imgUploadHint: '📷 Сүрөт тандаңыз (JPG, PNG, WEBP · 8MB)',
            st_ALL: 'Бардык статус',
            st_NEW: 'Жаңы',
            st_ACCEPTED: 'Кабыл алынды',
            st_COOKING: 'Даярдоо башталды',
            st_READY: 'Даяр болду',
            st_GIVEN_TO_COURIER: 'Курьерге берилди',
            st_DELIVERED: 'Жеткирилди',
            st_CANCELLED: 'Жокко чыгарылды',
            rt_daily: 'Күнүмдük отчёт',
            rt_evening: 'Кечки отчёт',
            rt_monthly: 'Айлык отчёт',
            rr_today: 'Бүгүн',
            rr_yesterday: 'Кечээ',
            rr_week: 'Бул жума',
            rr_month: 'Бул ай',
            rr_custom: 'Дата тандоо',
            hintKitchen: 'Ашкана бөлümүнө өткөр',
            cancelOrder: 'Жокко чыгар',
            btnCook: '🍳 Даярдоону баштоо',
            btnReady: '✅ Даяр болду',
            btnCourier: '🛵 Курьерге берүү',
            btnDelivered: '✓ Жеткирилди',
            edit: '✏️ Түзөтүү',
            hide: 'Жашыр',
            show: 'Кайра чыгар',
            delete: '🗑 Өчүр',
            available: 'Жеткиликтүү',
            hidden: 'Жашырылган',
            noOrders: 'Заказ табылган жок',
            noKitchen: 'Заказ жок',
            noFood: 'Тамак жок',
            noRestaurants: 'Ресторан жок',
            loadFailed: 'Жүктөлбөдү',
            som: 'сом',
            confirmCancel: 'Заказды четке кагасызбы?',
            confirmHide: 'Тамакты кардарларга жашырасызбы?',
            confirmShow: 'Тамакты кайра активдештиресизби?',
            confirmDelete: 'Тамакты толук өчүрөсүзбү? Бул аракет кайтарылбайт.',
            toastAccepted: 'Кабыл алынды ✓',
            toastCancelled: 'Жокко чыгарылды',
            toastStatus: 'Статус өзгөрдү ✓',
            toastSaved: 'Сакталды ✓',
            toastDeleted: 'Өчүрүлдү',
            toastError: 'Ката',
            toastSaveError: 'Ката: сакталган жок',
            toastOrdersFail: 'Заказдар жүктөлбөдү',
            toastKitchenFail: 'Ашкана жүктөлбөдү',
            toastMenuFail: 'Меню жүктөлбөдү',
            toastPickImage: 'Сүрөт тандаңыз',
            toastFillRequired: 'Ат, категория жана баа толтурулсун',
            toastLoadReport: 'Алгач отчёт жүктөңүз',
            reportDailyTitle: 'Күнүмдük отчёт',
            reportEveningTitle: 'Кечки отчёт',
            reportMonthlyTitle: 'Айлык отчёт',
            statTotalOrders: 'Жалпы заказ',
            statCompleted: 'Аякталган',
            statCancelled: 'Жокко чыгарылган',
            statRevenue: 'Киреше',
            statAvgCheck: 'Орточо чек',
            statCustomers: 'Кардарлар',
            statTotalRevenue: 'Жалпы киреше',
            statAvgDaily: 'Күнүмдük орто',
            topFoods: 'Эң көп сатылган тамактар',
            topFoodsMonthly: 'Топ тамактар',
            topCategories: 'Топ категориялар',
            orderStatusStats: 'Заказ статусу боюнча',
            reportOrders: 'Заказдар',
            noData: 'Маалымат жок',
            foodCol: 'Тамак',
            qtyCol: 'Саны'
        },
        ru: {
            pickTitle: '🏪 Админ-панель ресторана',
            pickSub: 'Выберите ресторан — заказы, кухня, меню и отчёты в одной панели',
            brandSub: 'Админ-панель',
            navDashboard: 'Главная',
            navOrders: 'Заказы',
            navKitchen: 'Экран кухни',
            navMenu: 'Управление меню',
            navReports: 'Отчёты',
            linkRatlion: '🧾 RATLION (центральный)',
            linkCafe: '🍳 Кухня (полная)',
            linkCustomer: '🌐 Сайт для клиентов',
            linkPlatform: '⚙️ Платформа',
            dashTitle: 'Главная',
            dashSub: 'Показатели на сегодня',
            cardRevenue: 'Выручка сегодня',
            cardTodayOrders: 'Заказов сегодня',
            cardCooking: 'Готовятся',
            cardReady: 'Готовые заказы',
            cardDelivered: 'Доставленные',
            ordersTitle: 'Заказы',
            ordersSub: 'Только заказы, принятые RATLION (без проверки оплаты)',
            ordersList: 'Список заказов',
            kitchenTitle: 'Экран кухни',
            kitchenSub: 'Управление статусами приготовления',
            menuTitle: 'Управление меню',
            menuSub: 'Добавление, редактирование, скрытие блюд',
            menuListTitle: 'Меню',
            reportsTitle: 'Отчёты',
            reportsSub: 'Дневные, вечерние и месячные отчёты',
            reportParams: 'Параметры отчёта',
            search: 'Поиск...',
            refresh: 'Обновить',
            loading: 'Загрузка...',
            newFood: 'Новое блюдо',
            editFood: 'Редактировать блюдо',
            colNo: '№',
            colCustomer: 'Клиент',
            colPhone: 'Телефон',
            colFood: 'Блюда',
            colSum: 'Сумма',
            colStatus: 'Статус',
            colTime: 'Время',
            colQty: 'Кол-во',
            showReport: 'Показать',
            print: 'Печать',
            save: 'Сохранить',
            cancel: 'Отмена',
            lblNameKg: 'Название (KG) *',
            lblNameRu: 'Название (RU)',
            lblCatKg: 'Категория (KG) *',
            lblCatRu: 'Категория (RU)',
            lblDescKg: 'Описание (KG)',
            lblDescRu: 'Описание (RU)',
            lblIngredients: 'Состав',
            lblPrice: 'Цена, сом *',
            lblImage: 'Фото *',
            imgUploadHint: '📷 Выберите фото (JPG, PNG, WEBP · 8MB)',
            st_ALL: 'Все статусы',
            st_NEW: 'Новый',
            st_ACCEPTED: 'Принят',
            st_COOKING: 'Готовится',
            st_READY: 'Готов',
            st_GIVEN_TO_COURIER: 'Передан курьеру',
            st_DELIVERED: 'Доставлен',
            st_CANCELLED: 'Отменён',
            rt_daily: 'Дневной отчёт',
            rt_evening: 'Вечерний отчёт',
            rt_monthly: 'Месячный отчёт',
            rr_today: 'Сегодня',
            rr_yesterday: 'Вчера',
            rr_week: 'Эта неделя',
            rr_month: 'Этот месяц',
            rr_custom: 'Свой период',
            hintKitchen: 'Перейти в раздел «Кухня»',
            cancelOrder: 'Отменить',
            btnCook: '🍳 Начать готовить',
            btnReady: '✅ Готово',
            btnCourier: '🛵 Передать курьеру',
            btnDelivered: '✓ Доставлено',
            edit: '✏️ Редактировать',
            hide: 'Скрыть',
            show: 'Показать',
            delete: '🗑 Удалить',
            available: 'Доступно',
            hidden: 'Скрыто',
            noOrders: 'Заказы не найдены',
            noKitchen: 'Нет заказов',
            noFood: 'Нет блюд',
            noRestaurants: 'Нет ресторанов',
            loadFailed: 'Не удалось загрузить',
            som: 'сом',
            confirmCancel: 'Отменить заказ?',
            confirmHide: 'Скрыть блюдо от клиентов?',
            confirmShow: 'Снова показать блюдо клиентам?',
            confirmDelete: 'Удалить блюдо полностью? Это действие нельзя отменить.',
            toastAccepted: 'Принят ✓',
            toastCancelled: 'Отменён',
            toastStatus: 'Статус изменён ✓',
            toastSaved: 'Сохранено ✓',
            toastDeleted: 'Удалено',
            toastError: 'Ошибка',
            toastSaveError: 'Ошибка: не сохранено',
            toastOrdersFail: 'Не удалось загрузить заказы',
            toastKitchenFail: 'Не удалось загрузить кухню',
            toastMenuFail: 'Не удалось загрузить меню',
            toastPickImage: 'Выберите фото',
            toastFillRequired: 'Заполните название, категорию и цену',
            toastLoadReport: 'Сначала загрузите отчёт',
            reportDailyTitle: 'Дневной отчёт',
            reportEveningTitle: 'Вечерний отчёт',
            reportMonthlyTitle: 'Месячный отчёт',
            statTotalOrders: 'Всего заказов',
            statCompleted: 'Завершено',
            statCancelled: 'Отменено',
            statRevenue: 'Выручка',
            statAvgCheck: 'Средний чек',
            statCustomers: 'Клиентов',
            statTotalRevenue: 'Общая выручка',
            statAvgDaily: 'Средняя за день',
            topFoods: 'Самые продаваемые блюда',
            topFoodsMonthly: 'Топ блюд',
            topCategories: 'Топ категорий',
            orderStatusStats: 'Статистика по статусам',
            reportOrders: 'Заказы',
            noData: 'Нет данных',
            foodCol: 'Блюдо',
            qtyCol: 'Кол-во'
        }
    };

    function t(key) { return (T[currentLang] && T[currentLang][key]) || T.ky[key] || key; }

    function q(id) { return document.getElementById(id); }
    function rid() { return scopeId ? '?restaurantId=' + encodeURIComponent(scopeId) : ''; }
    function money(v) { return Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }); }
    function esc(v) {
        return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function toast(msg) {
        const el = q('admToast');
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2800);
    }
    function badge(st) {
        const cls = { NEW:'adm-badge-new', ACCEPTED:'adm-badge-accepted', COOKING:'adm-badge-cooking',
            READY:'adm-badge-ready', GIVEN_TO_COURIER:'adm-badge-courier', DELIVERED:'adm-badge-delivered',
            CANCELLED:'adm-badge-cancelled' }[st] || '';
        return `<span class="adm-badge ${cls}">${t('st_' + st) || st}</span>`;
    }
    function menuName(item) {
        if (currentLang === 'ru') return item.nameRu || item.nameKg || item.name || '—';
        return item.nameKg || item.name || '—';
    }
    function menuCategory(item) {
        if (currentLang === 'ru') return item.categoryRu || item.categoryKg || item.category || '';
        return item.categoryKg || item.category || '';
    }
    function menuDesc(item) {
        if (currentLang === 'ru') return item.descriptionRu || item.descriptionKg || item.description || '';
        return item.descriptionKg || item.description || '';
    }

    function applyLanguage() {
        document.documentElement.lang = currentLang === 'ru' ? 'ru' : 'ky';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = t(key);
        });
        document.querySelectorAll('.adm-lang-opt').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
        });
        fillStatusFilter();
        fillReportSelects();
        if (scopeName) document.title = scopeName + ' — ' + t('brandSub');
        refreshDynamicViews();
    }

    window.admChangeLanguage = function (lang) {
        currentLang = lang === 'ru' ? 'ru' : 'ky';
        localStorage.setItem('adminLanguage', currentLang);
        applyLanguage();
    };

    function fillStatusFilter() {
        const sel = q('orderStatusFilter');
        if (!sel) return;
        const val = sel.value || 'ALL';
        const opts = ['ALL', 'ACCEPTED', 'COOKING', 'READY', 'GIVEN_TO_COURIER'];
        sel.innerHTML = opts.map(o => `<option value="${o}">${t('st_' + o)}</option>`).join('');
        sel.value = opts.includes(val) ? val : 'ALL';
    }

    function fillReportSelects() {
        const typeSel = q('reportType');
        const rangeSel = q('reportRange');
        if (typeSel) {
            const tv = typeSel.value || 'daily';
            typeSel.innerHTML = ['daily','evening','monthly'].map(v =>
                `<option value="${v}">${t('rt_' + v)}</option>`).join('');
            typeSel.value = tv;
        }
        if (rangeSel) {
            const rv = rangeSel.value || 'today';
            rangeSel.innerHTML = ['today','yesterday','week','month','custom'].map(v =>
                `<option value="${v}">${t('rr_' + v)}</option>`).join('');
            rangeSel.value = rv;
        }
    }

    function refreshDynamicViews() {
        if (allOrders.length) renderOrdersTable();
        const kg = q('kitchenGrid');
        if (kg && kg.children.length && !kg.querySelector('.adm-empty')) {
            loadKitchen();
        } else if (kg && kg.querySelector('.adm-empty')) {
            kg.innerHTML = `<div class="adm-empty"><div class="adm-empty-icon">🍳</div><h3>${t('noKitchen')}</h3></div>`;
        }
        if (menuItems.length) renderMenuList();
        if (editingMenuId !== null || q('menuModal').classList.contains('open')) {
            q('menuModalTitle').textContent = editingMenuId ? t('editFood') : t('newFood');
        }
        if (reportData) {
            if (lastReportType === 'monthly') renderMonthlyReport(reportData);
            else renderDailyStyleReport(reportData, lastReportType);
        }
    }

    function init() {
        applyLanguage();
        if (scopeId) {
            applyBrand();
            showApp();
            handleHash();
            loadDashboard();
            setInterval(loadDashboard, 15000);
            window.addEventListener('hashchange', handleHash);
        } else {
            loadPicker();
        }
        bindMenuForm();
    }

    function applyBrand() {
        q('brandIcon').textContent = ADMIN.emoji || '🏪';
        q('brandName').textContent = scopeName;
        q('brandSub').textContent = t('brandSub');
        document.title = scopeName + ' — ' + t('brandSub');
        if (ADMIN.color) document.documentElement.style.setProperty('--adm-green', ADMIN.color);
        const base = '/ratlion';
        q('linkRatlion').href = base;
        q('linkCafe').href = '/kitchen/' + encodeURIComponent(scopeSlug || '');
        q('linkMenu').href = '/r/' + encodeURIComponent(scopeSlug || '');
    }

    async function loadPicker() {
        q('admPick').style.display = 'flex';
        try {
            const res = await fetch('/api/restaurants/public');
            const list = await res.json();
            q('admRestList').innerHTML = list.map(r =>
                `<a class="adm-rest-link" href="/admin?slug=${encodeURIComponent(r.slug)}">${r.emoji || '🏪'} ${esc(r.name)}</a>`
            ).join('') || `<p>${t('noRestaurants')}</p>`;
        } catch (e) {
            q('admRestList').innerHTML = `<p>${t('loadFailed')}</p>`;
        }
    }

    function showApp() {
        q('admPick').style.display = 'none';
        q('admLayout').style.display = 'flex';
    }

    window.admNav = function (section, btn) {
        document.querySelectorAll('.adm-nav-item').forEach(n => n.classList.remove('active'));
        if (btn) btn.classList.add('active');
        document.querySelectorAll('.adm-section').forEach(s => s.classList.remove('active'));
        q('sec-' + section).classList.add('active');
        location.hash = section;
        if (section === 'dashboard') loadDashboard();
        if (section === 'orders') loadOrders();
        if (section === 'kitchen') loadKitchen();
        if (section === 'menu') loadMenu();
    };

    function handleHash() {
        const h = (location.hash || '#dashboard').replace('#', '');
        const btn = document.querySelector(`.adm-nav-item[data-sec="${h}"]`);
        if (btn) admNav(h, btn);
    }

    async function loadDashboard() {
        if (!scopeId) return;
        try {
            const [activeRes, todayRes] = await Promise.all([
                fetch('/orders/active' + rid()),
                fetch('/reports/today' + rid())
            ]);
            const active = await activeRes.json();
            const today = await todayRes.json();
            q('cardRevenue').textContent = money(today.totalRevenue) + ' ' + t('som');
            q('cardTodayOrders').textContent = today.totalOrders || 0;
            q('cardCooking').textContent = active.filter(o => o.orderStatus === 'COOKING').length;
            q('cardReady').textContent = active.filter(o => o.orderStatus === 'READY').length;
            q('cardDelivered').textContent = today.totalOrders || 0;
        } catch (e) { /* silent */ }
    }

    async function loadOrders() {
        if (!scopeId) return;
        try {
            const res = await fetch('/orders/cafe' + rid());
            allOrders = await res.json();
            renderOrdersTable();
        } catch (e) { toast(t('toastOrdersFail')); }
    }

    function renderOrdersTable() {
        const search = (q('orderSearch').value || '').trim().toLowerCase();
        const status = q('orderStatusFilter').value;
        let list = allOrders.slice();
        if (status !== 'ALL') list = list.filter(o => o.orderStatus === status);
        if (search) {
            list = list.filter(o => [o.customerName, o.phone, o.displayOrderNumber, o.itemName, String(o.id)]
                .filter(Boolean).join(' ').toLowerCase().includes(search));
        }
        const tbody = q('ordersTableBody');
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="adm-empty">${t('noOrders')}</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(o => `
            <tr>
                <td><strong>${esc(o.displayOrderNumber || o.id)}</strong></td>
                <td>${esc(o.customerName)}</td>
                <td>${esc(o.phone)}</td>
                <td>${esc((o.itemName || '').slice(0, 40))}</td>
                <td>${money(o.totalPrice)} ${t('som')}</td>
                <td>${badge(o.orderStatus)}</td>
                <td>${kitchenActionHint(o.orderStatus)}</td>
            </tr>`).join('');
    }

    function kitchenActionHint(st) {
        if (st === 'ACCEPTED') return `<span style="font-size:12px;color:var(--adm-muted)">${t('hintKitchen')}</span>`;
        return '';
    }

    window.admFilterOrders = renderOrdersTable;

    async function loadKitchen() {
        if (!scopeId) return;
        try {
            const res = await fetch('/orders/cafe' + rid());
            const list = await res.json();
            renderKitchen(list);
        } catch (e) { toast(t('toastKitchenFail')); }
    }

    function renderKitchen(list) {
        const grid = q('kitchenGrid');
        if (!list.length) {
            grid.innerHTML = `<div class="adm-empty"><div class="adm-empty-icon">🍳</div><h3>${t('noKitchen')}</h3></div>`;
            return;
        }
        grid.innerHTML = list.map(o => {
            const st = o.orderStatus;
            let btn = '';
            if (st === 'ACCEPTED') btn = `<button class="adm-btn adm-btn-primary adm-btn-sm" onclick="admKitchenAction(${o.id},'cook')">${t('btnCook')}</button>`;
            if (st === 'COOKING') btn = `<button class="adm-btn adm-btn-primary adm-btn-sm" onclick="admKitchenAction(${o.id},'ready')">${t('btnReady')}</button>`;
            if (st === 'READY') btn = `<button class="adm-btn adm-btn-primary adm-btn-sm" onclick="admKitchenAction(${o.id},'courier')">${t('btnCourier')}</button>`;
            if (st === 'GIVEN_TO_COURIER') btn = `<button class="adm-btn adm-btn-outline adm-btn-sm" onclick="admKitchenAction(${o.id},'deliver')">${t('btnDelivered')}</button>`;
            return `<article class="adm-kitchen-card${st === 'ACCEPTED' ? ' is-new' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                    <strong style="font-size:20px;color:var(--adm-green-dark)">${esc(o.displayOrderNumber || o.id)}</strong>
                    ${badge(st)}
                </div>
                <div style="font-size:13px;color:var(--adm-muted);margin-bottom:8px">👤 ${esc(o.customerName)} · 📞 ${esc(o.phone)}</div>
                <div style="font-size:14px;margin-bottom:12px;line-height:1.4">${esc(o.itemName)}</div>
                ${btn}
            </article>`;
        }).join('');
    }

    window.admKitchenAction = async function (id, ep) {
        const res = await fetch('/orders/' + id + '/' + ep, { method: 'PUT' });
        if (res.ok) { toast(t('toastStatus')); loadKitchen(); loadDashboard(); }
        else toast(t('toastError'));
    };

    async function loadMenu() {
        if (!scopeId) return;
        try {
            const res = await fetch('/menu' + rid());
            menuItems = await res.json();
            renderMenuList();
        } catch (e) { toast(t('toastMenuFail')); }
    }

    function renderMenuList() {
        const search = (q('menuSearch').value || '').trim().toLowerCase();
        let list = menuItems.slice();
        if (search) list = list.filter(i => [i.nameKg, i.nameRu, i.name, i.categoryKg, i.category].join(' ').toLowerCase().includes(search));
        const el = q('menuList');
        if (!list.length) {
            el.innerHTML = `<div class="adm-empty">${t('noFood')}</div>`;
            return;
        }
        el.innerHTML = list.map(item => {
            const avail = item.available !== false;
            const img = item.image
                ? `<img src="${esc(item.image)}" alt="">`
                : `<div class="adm-menu-ph">🍽</div>`;
            return `<article class="adm-menu-item">
                ${img}
                <div>
                    <strong style="font-size:16px">${esc(menuName(item))}</strong>
                    <div style="font-size:12px;color:var(--adm-muted);margin-top:4px">${esc(menuCategory(item))}</div>
                    <div style="font-size:13px;margin-top:6px;color:var(--adm-muted)">${esc(menuDesc(item).slice(0, 80))}</div>
                    <div style="font-size:18px;font-weight:800;color:var(--adm-green-dark);margin-top:8px">${money(item.price)} ${t('som')}</div>
                    <span class="adm-badge ${avail ? 'adm-badge-delivered' : 'adm-badge-cancelled'}" style="margin-top:8px">${avail ? t('available') : t('hidden')}</span>
                </div>
                <div class="adm-menu-actions">
                    <button class="adm-btn adm-btn-outline adm-btn-sm" onclick="admEditMenu(${item.id})">${t('edit')}</button>
                    <button class="adm-btn adm-btn-outline adm-btn-sm" onclick="admToggleMenu(${item.id}, ${avail})">${avail ? t('hide') : t('show')}</button>
                    <button class="adm-btn adm-btn-danger adm-btn-sm" onclick="admDeleteMenu(${item.id})">${t('delete')}</button>
                </div>
            </article>`;
        }).join('');
    }

    window.admFilterMenu = renderMenuList;

    window.admOpenMenuForm = function (editId) {
        editingMenuId = editId || null;
        menuImageFile = null;
        q('menuModalTitle').textContent = editId ? t('editFood') : t('newFood');
        q('menuForm').reset();
        q('menuImgPreview').classList.remove('show');
        if (editId) {
            const item = menuItems.find(m => m.id === editId);
            if (item) fillMenuForm(item);
        }
        q('menuModal').classList.add('open');
    };

    function fillMenuForm(item) {
        q('mfName').value = item.nameKg || item.name || '';
        q('mfCategory').value = item.categoryKg || item.category || '';
        q('mfDesc').value = item.descriptionKg || item.description || '';
        q('mfPrice').value = item.price || '';
        q('mfNameRu').value = item.nameRu || '';
        q('mfCategoryRu').value = item.categoryRu || '';
        q('mfDescRu').value = item.descriptionRu || '';
        q('mfIngredients').value = item.ingredientsKg || item.ingredients || '';
        if (item.image) {
            q('menuImgPreview').querySelector('img').src = item.image;
            q('menuImgPreview').classList.add('show');
        }
    }

    window.admCloseMenuModal = function () {
        q('menuModal').classList.remove('open');
        editingMenuId = null;
        menuImageFile = null;
    };

    window.admEditMenu = function (id) { admOpenMenuForm(id); };

    function bindMenuForm() {
        q('menuImgInput').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { toast(t('toastPickImage')); return; }
            menuImageFile = file;
            const reader = new FileReader();
            reader.onload = e => {
                q('menuImgPreview').querySelector('img').src = e.target.result;
                q('menuImgPreview').classList.add('show');
            };
            reader.readAsDataURL(file);
        });
        q('menuForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveMenuItem();
        });
    }

    async function saveMenuItem() {
        const payload = {
            nameKg: q('mfName').value.trim(),
            nameRu: q('mfNameRu').value.trim() || q('mfName').value.trim(),
            categoryKg: q('mfCategory').value.trim(),
            categoryRu: q('mfCategoryRu').value.trim() || q('mfCategory').value.trim(),
            descriptionKg: q('mfDesc').value.trim(),
            descriptionRu: q('mfDescRu').value.trim(),
            ingredientsKg: q('mfIngredients').value.trim(),
            ingredientsRu: q('mfIngredients').value.trim(),
            price: Number(q('mfPrice').value),
            restaurantId: scopeId,
            available: true
        };
        if (!payload.nameKg || !payload.categoryKg || payload.price <= 0) {
            toast(t('toastFillRequired'));
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
                if (!menuImageFile) { toast(t('toastPickImage')); return; }
                await createMenuMultipart(payload);
            }
            toast(t('toastSaved'));
            admCloseMenuModal();
            loadMenu();
        } catch (e) {
            toast(t('toastSaveError'));
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

    window.admToggleMenu = async function (id, currentlyAvailable) {
        if (!confirm(currentlyAvailable ? t('confirmHide') : t('confirmShow'))) return;
        const res = await fetch('/menu/' + id + '/availability?available=' + (!currentlyAvailable), { method: 'PUT' });
        if (res.ok) { toast(t('toastStatus')); loadMenu(); }
    };

    window.admDeleteMenu = async function (id) {
        if (!confirm(t('confirmDelete'))) return;
        const res = await fetch('/menu/' + id, { method: 'DELETE' });
        if (res.ok) { toast(t('toastDeleted')); loadMenu(); }
    };

    /* ===== Reports ===== */
    function dateRange(preset) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start, end;
        if (preset === 'today') { start = end = today; }
        else if (preset === 'yesterday') { start = end = new Date(today); start.setDate(start.getDate() - 1); }
        else if (preset === 'week') {
            end = today;
            start = new Date(today);
            start.setDate(start.getDate() - 6);
        } else if (preset === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = today;
        } else {
            start = new Date(q('reportFrom').value);
            end = new Date(q('reportTo').value);
        }
        return { start, end };
    }

    function fmtDate(d) {
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    window.admLoadReport = async function () {
        const type = q('reportType').value;
        lastReportType = type;
        const preset = q('reportRange').value;
        if (!scopeId) return;

        if (type === 'monthly') {
            const now = new Date();
            const res = await fetch(`/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth()+1}${scopeId ? '&restaurantId=' + scopeId : ''}`);
            reportData = await res.json();
            renderMonthlyReport(reportData);
            return;
        }

        const { start, end } = dateRange(preset);
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        const allOrdersList = [];
        for (const day of days) {
            const ds = fmtDate(day);
            const res = await fetch('/reports/daily?date=' + ds + (scopeId ? '&restaurantId=' + scopeId : ''));
            const rep = await res.json();
            if (rep.orders) allOrdersList.push(...rep.orders);
        }

        const allRes = await fetch('/orders' + rid());
        const scopedAll = await allRes.json();
        const cancelled = scopedAll.filter(o => {
            const d = o.createdAt ? o.createdAt.slice(0, 10) : '';
            return o.orderStatus === 'CANCELLED' && d >= fmtDate(start) && d <= fmtDate(end);
        });

        if (type === 'evening') {
            const eveningOrders = allOrdersList.filter(o => {
                if (!o.createdAt) return false;
                return new Date(o.createdAt).getHours() >= 18;
            });
            reportData = buildAggregatedReport(eveningOrders, t('reportEveningTitle'), cancelled.length);
            renderDailyStyleReport(reportData, type);
        } else {
            const merged = buildAggregatedReport(allOrdersList, t('reportDailyTitle'), cancelled.length);
            merged.totalOrdersAll = scopedAll.filter(o => {
                const d = o.createdAt ? o.createdAt.slice(0, 10) : '';
                return d >= fmtDate(start) && d <= fmtDate(end);
            }).length;
            reportData = merged;
            renderDailyStyleReport(reportData, type);
        }
    };

    function buildAggregatedReport(orders, title, cancelledCount) {
        let revenue = 0, qty = 0;
        const sold = {};
        const customers = new Set();
        orders.forEach(o => {
            revenue += Number(o.totalPrice || 0);
            qty += Number(o.quantity || 0);
            customers.add(o.phone || o.customerName);
            parseItems(o.itemName).forEach(([name, nq]) => { sold[name] = (sold[name] || 0) + nq; });
        });
        const top = Object.entries(sold).sort((a,b) => b[1]-a[1]).slice(0, 10);
        return {
            title, totalOrders: orders.length, completedOrders: orders.length,
            cancelledOrders: cancelledCount, totalRevenue: revenue,
            averageOrderAmount: orders.length ? revenue / orders.length : 0,
            totalQuantity: qty, customers: customers.size, soldItems: sold, topItems: top, orders
        };
    }

    function parseItems(raw) {
        if (!raw) return [];
        return raw.split(',').map(p => {
            const t2 = p.trim();
            const m = t2.match(/^(.+?)\s+x\s*(\d+)$/i);
            return m ? [m[1].trim(), Number(m[2])] : [t2, 1];
        });
    }

    function renderDailyStyleReport(data, type) {
        q('reportResult').innerHTML = `
            <div class="adm-panel" id="reportPrintArea">
                <h2 style="margin-bottom:16px">${esc(data.title)} — ${esc(scopeName)}</h2>
                <div class="adm-report-stats">
                    <div class="adm-stat-box"><div class="label">${t('statTotalOrders')}</div><div class="val">${data.totalOrdersAll || data.totalOrders}</div></div>
                    <div class="adm-stat-box"><div class="label">${t('statCompleted')}</div><div class="val">${data.completedOrders}</div></div>
                    <div class="adm-stat-box"><div class="label">${t('statCancelled')}</div><div class="val">${data.cancelledOrders}</div></div>
                    <div class="adm-stat-box"><div class="label">${t('statRevenue')}</div><div class="val">${money(data.totalRevenue)}</div></div>
                    <div class="adm-stat-box"><div class="label">${t('statAvgCheck')}</div><div class="val">${money(data.averageOrderAmount)}</div></div>
                    ${type === 'evening' ? `<div class="adm-stat-box"><div class="label">${t('statCustomers')}</div><div class="val">${data.customers}</div></div>` : ''}
                </div>
                <h3 style="margin-bottom:10px;font-size:15px">${t('topFoods')}</h3>
                ${renderTopItems(data.topItems)}
                ${data.orders && data.orders.length ? renderOrdersMiniTable(data.orders) : ''}
            </div>`;
    }

    function renderMonthlyReport(data) {
        const sold = data.soldItems || {};
        const top = Object.entries(sold).sort((a,b) => b[1]-a[1]).slice(0, 10);
        q('reportResult').innerHTML = `
            <div class="adm-panel" id="reportPrintArea">
                <h2 style="margin-bottom:16px">${t('reportMonthlyTitle')} — ${esc(data.monthName || '')} ${data.year || ''}</h2>
                <div class="adm-report-stats">
                    <div class="adm-stat-box"><div class="label">${t('statTotalRevenue')}</div><div class="val">${money(data.totalRevenue)}</div></div>
                    <div class="adm-stat-box"><div class="label">${t('statTotalOrders')}</div><div class="val">${data.totalOrders}</div></div>
                    <div class="adm-stat-box"><div class="label">${t('statAvgCheck')}</div><div class="val">${money(data.averageOrderAmount)}</div></div>
                    <div class="adm-stat-box"><div class="label">${t('statAvgDaily')}</div><div class="val">${money((data.totalRevenue||0) / Math.max(1, (data.dailyReports||[]).length))}</div></div>
                </div>
                <h3 style="margin:16px 0 10px;font-size:15px">${t('topFoodsMonthly')}</h3>
                ${renderTopItems(top)}
            </div>`;
    }

    function renderTopItems(items) {
        if (!items || !items.length) return `<p style="color:var(--adm-muted)">${t('noData')}</p>`;
        return `<table class="adm-table"><thead><tr><th>${t('foodCol')}</th><th>${t('qtyCol')}</th></tr></thead><tbody>
            ${items.map(([n,c]) => `<tr><td>${esc(n)}</td><td><strong>${c}</strong></td></tr>`).join('')}
        </tbody></table>`;
    }

    function renderOrdersMiniTable(orders) {
        const search = (q('reportSearch').value || '').trim().toLowerCase();
        let list = orders.slice();
        if (search) list = list.filter(o => JSON.stringify(o).toLowerCase().includes(search));
        return `<h3 style="margin:20px 0 10px;font-size:15px">${t('reportOrders')}</h3>
            <div class="adm-table-wrap"><table class="adm-table"><thead><tr>
                <th>${t('colNo')}</th><th>${t('colCustomer')}</th><th>${t('colSum')}</th><th>${t('colTime')}</th>
            </tr></thead><tbody>
            ${list.map(o => `<tr><td>${esc(o.displayOrderNumber||o.id)}</td><td>${esc(o.customerName)}</td><td>${money(o.totalPrice)}</td><td>${esc((o.createdAt||'').slice(11,16))}</td></tr>`).join('')}
            </tbody></table></div>`;
    }

    window.admPrintReport = function () { window.print(); };

    window.admExportExcel = function () {
        if (!reportData) { toast(t('toastLoadReport')); return; }
        let csv = 'Report,' + scopeName + '\n';
        csv += t('statTotalOrders') + ',' + (reportData.totalOrders||0) + '\n';
        csv += t('statRevenue') + ',' + (reportData.totalRevenue||0) + '\n';
        csv += t('statAvgCheck') + ',' + (reportData.averageOrderAmount||0) + '\n\n';
        csv += t('foodCol') + ',' + t('qtyCol') + '\n';
        const items = reportData.topItems || Object.entries(reportData.soldItems || {});
        items.forEach(([n,c]) => { csv += `"${String(n).replace(/"/g,'""')}",${c}\n`; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'report-' + scopeSlug + '.csv';
        a.click();
    };

    window.admExportPdf = function () { window.print(); };

    window.loadOrders = loadOrders;
    window.loadKitchen = loadKitchen;

    init();
})();
