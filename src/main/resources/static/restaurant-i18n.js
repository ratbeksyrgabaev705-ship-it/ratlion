(function () {
    const STORAGE_KEY = 'customerLanguage';

    const STRINGS = {
        ky: {
            searchPlaceholder: 'Издее...',
            searchFood: 'Тамак издөө...',
            viewAll: 'Баарын көрүү ›',
            cartItems: 'Себетте {count} товар',
            openCart: 'Себетке өтүү →',
            viewCart: 'Себетти көрүү ›',
            home: 'Башкы',
            cart: 'Себет',
            menu: 'Меню',
            menuLoading: 'Меню жүктөлүп жатат...',
            menuError: 'Меню жүктөлбөдү',
            notFound: 'Тамак табылган жок',
            heroTitleFamily: 'Үй-бүлөңүз менен<br>жагымдуу эс алыңыз!',
            heroSubtitleFamily: 'Даамдуу тамактар жана жагымдуу атмосфера сизди күтөт.',
            addToCart: 'Себетке кошуу',
            composition: 'Составы',
            emptyCart: 'Себет бош',
            backToMenu: 'Менюга кайтуу',
            stepCart: '1. Себет',
            stepInfo: '2. Маалымат',
            stepPay: '3. Төлөм',
            toCheckout: 'Маалыматка өтүү',
            itemsLabel: 'Товарлар ({count})',
            delivery: 'Жеткируу',
            grandTotal: 'Жалпы сумма',
            foodComment: 'Тамакка комментарий',
            foodCommentPlaceholder: 'Бул жерге тамакка тийиштүү каалооңузду жазыңыз...',
            checkoutTitle: 'Буйрутманы оформилоо',
            customerInfo: 'Кардар маалыматы',
            yourName: 'Атыңыз',
            namePlaceholder: 'Атыңызды жазыңыз',
            phone: 'Телефон номери',
            address: 'Дарегиңиз',
            addressPlaceholder: 'Шаар, көчө, үй',
            comment: 'Багыт / Комментарий',
            commentPlaceholder: 'Мисалы: кызыл дарбаза',
            orderList: 'Буйрутма тизмеси',
            edit: 'Түзөтүү',
            workingHours: '10:00 – 23:30',
            orderInfoTitle: 'Буйрутма тууралуу маалымат',
            orderInfoP1: 'Тамактарыңыз буйрутма кабыл алынгандан кийин гана жаңыдан даярдалат.',
            orderInfoP2: 'Орточо даярдоо убактысы —',
            orderInfoP2Time: '20–25 мүнөт',
            orderInfoP3: 'Сизге ар дайым жаңы, даамдуу жана жаңыдан даярдалган тамактарды жеткиребиз!',
            paymentMethod: 'Төлөм ыкмасы',
            payBankTransfer: 'Банк аркылуу которуу (скриншот жүктөө)',
            payBankHint: 'Төлөмдү которуп, скриншотту ылдый жүктөңүз',
            mbankLabel: 'MBANK номери',
            recipientPrefix: 'Алуучу:',
            transferAmountLabel: 'Которула турган сумма:',
            uploadReceipt: 'Төлөмдүн скриншотун жүктөңүз',
            uploadReceiptBtn: 'Скрин жүктөө',
            removeReceipt: 'Өчүрүү',
            goToPay: 'Төлөөгө өтүү',
            submitOrder: 'Буйрутманы жөнөтүү',
            submitting: 'Жөнөтүлүп жатат...',
            successTitle: 'Буйрутмаңыз кабыл алынды',
            successText: 'Төлөмдүн чеги текшерилгенден кийин буйрутма даярдалат.',
            jolchuThanks: 'Рахмат!',
            jolchuPaymentSent: 'Төлөмүңүз жөнөтүлдү',
            jolchuContact: 'ДААМЖОЛ жеткирүү сервиси сиз менен байланышат.',
            jolchuStep1: 'Төлөм жөнөтүлдү',
            jolchuStep2: 'Сиз менен байланышат',
            jolchuStep3: 'Даяр болгондо жеткирип берет',
            jolchuNoticeTitle: 'Эскертүү',
            jolchuNoticeText: 'Оператор сиз менен жакын арада байланышып, буйрутманы ырастайт жана жеткирүү убактысын айтып берет.',
            orderNumberLabel: 'Буйрутма номери',
            trackOrder: 'Буйрутманын статусун көрүү',
            backHome: 'Башкы бетке кайтуу',
            errName: 'Атыңызды жазыңыз.',
            errPhone: 'Телефон номериңизди туура жазыңыз.',
            errAddress: 'Дарегиңизди жазыңыз.',
            errReceipt: 'Төлөмдүн чегин жүктөңүз.',
            errImageFormat: 'Сүрөт форматында болушу керек',
            errSubmit: 'Буйрутма жөнөтүлгөн жок',
            errGeneric: 'Ката чыкты',
            currency: 'сом',
            bmHome: 'Башкы бет',
            bmPopular: 'Популярдуу',
            bmCombo: 'Комбо топтомдор',
            bmViewAll: 'Бардыгын көрүү',
            bmPromoTitle: 'Базар-Коргон шаарыбызды<br><em>даамдуу</em> кылалы!',
            bmPromoSub: 'Жаңы бургерлер, тез жеткирүү — үйүңүзгө чейин.',
            bmDelivery: '30-60 мин',
            bmGoToCart: 'Себетке өтүү →',
            bmTrust1: 'Тез жеткирүү 30-60 мүн',
            bmTrust2: 'Сапатка кепилдик 100% табигый',
            bmTrust3: 'Коопсуз төлөм чек менен',
            bmTrust4: 'Колдоо кызматы 24/7',
            bmTagHit: 'ХИТ',
            bmTagNew: 'ЖАҢЫ',
            bmTagSpicy: 'АЧУУ',
            catBurgers: 'Бургерлер',
            catCombo: 'Комбо',
            catShawarma: 'Шаурма',
            catSnacks: 'Снэктер',
            catDrinks: 'Суусундуктар',
            catSauces: 'Соустар',
            catAll: 'Баары',
            ocHome: 'Башкы бет',
            ocHeroTitle: 'Улуттук даам —<br>үйдөгүдей!',
            ocHeroSubtitle: 'Лагман · Плов · Самса · Шорпо',
            ocHours: '10:00 – 23:00',
            ocPopular: 'Популярдуу',
            ocNational: 'Улуттук тамактар',
            ocViewAll: 'Бардыгын көрүү',
            ocPromoTitle: 'Базар-Коргон<br><em>даамдуу</em> чайканасы!',
            ocPromoSub: 'Лагман, плов, самса — үйдөгүдей даам.',
            ocDelivery: '30-60 мин',
            ocTrust1: 'Тез жеткирүү 30-60 мүн',
            ocTrust2: 'Үйдөгүдей даам',
            ocTrust3: 'Коопсуз төлөм чек менен',
            ocTrust4: 'Колдоо кызматы 24/7',
            ocTagHit: 'ХИТ',
            ocTagNew: 'ЖАҢЫ',
            ocTagSpicy: 'АЧУУ',
            ocCatLagman: 'Лагман',
            ocCatPlov: 'Плов',
            ocCatSamsa: 'Самса',
            ocCatShorpo: 'Шорпо',
            ocCatNational: 'Улуттук',
            ocCatDrinks: 'Ичимдиктер',
            zhHome: 'Башкы бет',
            zhPopular: 'Популярдуу',
            zhHot: 'Ысыk самса',
            zhViewAll: 'Бардыгын көрүү',
            zhPromoTitle: 'Жаңы <em>бышкан</em><br>самса — ар дайым!',
            zhPromoSub: 'Тандырда ысыk, жумшак самса — үйүңүзгө чейин.',
            zhDelivery: '30-45 мин',
            zhTrust1: 'Тандырда ысыk самса',
            zhTrust2: '100% табигый продукт',
            zhTrust3: 'Коопсуз төлөм',
            zhTrust4: 'Колдоо 24/7',
            zhTagHit: 'ХИТ',
            zhTagNew: 'ЖАҢЫ',
            zhTagSpicy: 'АЧУУ',
            zhCatSamsa: 'Самса',
            zhCatBakery: 'Выпечка',
            zhCatHot: 'Ысыk',
            zhCatDrinks: 'Ичимдиктер'
        },
        ru: {
            searchPlaceholder: 'Поиск...',
            searchFood: 'Поиск блюда...',
            viewAll: 'Смотреть все ›',
            cartItems: 'В корзине: {count}',
            openCart: 'Перейти в корзину →',
            viewCart: 'Перейти в корзину ›',
            home: 'Главная',
            cart: 'Корзина',
            menu: 'Меню',
            menuLoading: 'Меню загружается...',
            menuError: 'Не удалось загрузить меню',
            notFound: 'Блюдо не найдено',
            heroTitleFamily: 'Отдыхайте приятно<br>всей семьёй!',
            heroSubtitleFamily: 'Вкусная еда и уютная атмосфера ждут вас.',
            addToCart: 'Добавить в корзину',
            composition: 'Состав',
            emptyCart: 'Корзина пуста',
            backToMenu: 'В меню',
            stepCart: '1. Корзина',
            stepInfo: '2. Данные',
            stepPay: '3. Оплата',
            toCheckout: 'Перейти к данным',
            itemsLabel: 'Товары ({count})',
            delivery: 'Доставка',
            grandTotal: 'Итого',
            foodComment: 'Комментарий к блюду',
            foodCommentPlaceholder: 'Например: меньше лука, без зелени',
            checkoutTitle: 'Оформление заказа',
            customerInfo: 'Данные клиента',
            yourName: 'Ваше имя',
            namePlaceholder: 'Введите имя',
            phone: 'Телефон',
            address: 'Адрес',
            addressPlaceholder: 'Город, улица, дом',
            comment: 'Ориентир / Комментарий',
            commentPlaceholder: 'Например: красные ворота',
            orderList: 'Список заказа',
            edit: 'Изменить',
            workingHours: '10:00 – 23:30',
            orderInfoTitle: 'Информация о заказе',
            orderInfoP1: 'Блюда готовятся только после подтверждения заказа.',
            orderInfoP2: 'Среднее время приготовления —',
            orderInfoP2Time: '20–25 минут',
            orderInfoP3: 'Мы доставляем только свежие, вкусные блюда!',
            paymentMethod: 'Способ оплаты',
            payBankTransfer: 'Банковский перевод (загрузка скриншота)',
            payBankHint: 'Переведите оплату и загрузите скриншот ниже',
            mbankLabel: 'Номер MBANK',
            recipientPrefix: 'Получатель:',
            transferAmountLabel: 'Сумма перевода:',
            uploadReceipt: 'Загрузите скриншот оплаты',
            uploadReceiptBtn: 'Загрузить скрин',
            removeReceipt: 'Удалить',
            goToPay: 'Перейти к оплате',
            submitOrder: 'Отправить заказ',
            submitting: 'Отправка...',
            successTitle: 'Заказ принят',
            successText: 'После проверки чека заказ будет готовиться.',
            jolchuThanks: 'Спасибо!',
            jolchuPaymentSent: 'Оплата отправлена',
            jolchuContact: 'Служба доставки ДААМЖОЛ свяжется с вами.',
            jolchuStep1: 'Оплата отправлена',
            jolchuStep2: 'Свяжутся с вами',
            jolchuStep3: 'Доставят когда готово',
            jolchuNoticeTitle: 'Напоминание',
            jolchuNoticeText: 'Оператор скоро свяжется с вами, подтвердит заказ и сообщит время доставки.',
            orderNumberLabel: 'Номер заказа',
            trackOrder: 'Статус заказа',
            backHome: 'На главную',
            errName: 'Введите имя.',
            errPhone: 'Введите корректный телефон.',
            errAddress: 'Введите адрес.',
            errReceipt: 'Загрузите чек об оплате.',
            errImageFormat: 'Нужен формат изображения',
            errSubmit: 'Не удалось отправить заказ',
            errGeneric: 'Произошла ошибка',
            currency: 'сом',
            bmHome: 'Главная',
            bmPopular: 'Популярное',
            bmCombo: 'Комбо наборы',
            bmViewAll: 'Смотреть все',
            bmPromoTitle: 'Сделаем наш город<br><em>вкуснее</em>!',
            bmPromoSub: 'Свежие бургеры и быстрая доставка до дома.',
            bmDelivery: '30-60 мин',
            bmGoToCart: 'Перейти в корзину →',
            bmTrust1: 'Быстрая доставка 30-60 мин',
            bmTrust2: 'Гарантия качества 100% натуральное',
            bmTrust3: 'Безопасная оплата с чеком',
            bmTrust4: 'Поддержка 24/7',
            bmTagHit: 'ХИТ',
            bmTagNew: 'НОВИНКА',
            bmTagSpicy: 'ОСТРОЕ',
            catBurgers: 'Бургеры',
            catCombo: 'Комбо',
            catShawarma: 'Шаурма',
            catSnacks: 'Снеки',
            catDrinks: 'Напитки',
            catSauces: 'Соусы',
            catAll: 'Все',
            ocHome: 'Главная',
            ocHeroTitle: 'Национальная кухня —<br>как дома!',
            ocHeroSubtitle: 'Лагман · Плов · Самса · Шорпа',
            ocHours: '10:00 – 23:00',
            ocPopular: 'Популярное',
            ocNational: 'Национальные блюда',
            ocViewAll: 'Смотреть все',
            ocPromoTitle: 'Вкусная<br><em>чайхана</em> города!',
            ocPromoSub: 'Лагман, плов, самса — как дома.',
            ocDelivery: '30-60 мин',
            ocTrust1: 'Быстрая доставка 30-60 мин',
            ocTrust2: 'Домашний вкус',
            ocTrust3: 'Безопасная оплата с чеком',
            ocTrust4: 'Поддержка 24/7',
            ocTagHit: 'ХИТ',
            ocTagNew: 'НОВИНКА',
            ocTagSpicy: 'ОСТРОЕ',
            ocCatLagman: 'Лагман',
            ocCatPlov: 'Плов',
            ocCatSamsa: 'Самса',
            ocCatShorpo: 'Шорпа',
            ocCatNational: 'Национальное',
            ocCatDrinks: 'Напитки',
            zhHome: 'Главная',
            zhPopular: 'Популярное',
            zhHot: 'Горячая самса',
            zhViewAll: 'Смотреть все',
            zhPromoTitle: 'Свежая<br><em>самса</em> — всегда!',
            zhPromoSub: 'Горячая самса из тандыра — до дома.',
            zhDelivery: '30-45 мин',
            zhTrust1: 'Горячая самса из тандыра',
            zhTrust2: '100% натуральные продукты',
            zhTrust3: 'Безопасная оплата',
            zhTrust4: 'Поддержка 24/7',
            zhTagHit: 'ХИТ',
            zhTagNew: 'НОВИНКА',
            zhTagSpicy: 'ОСТРОЕ',
            zhCatSamsa: 'Самса',
            zhCatBakery: 'Выпечка',
            zhCatHot: 'Горячее',
            zhCatDrinks: 'Напитки'
        }
    };

    function getLang() {
        return localStorage.getItem(STORAGE_KEY) || 'ky';
    }

    function setLang(lang) {
        const next = lang === 'ru' ? 'ru' : 'ky';
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next === 'ru' ? 'ru' : 'ky';
        updatePillUi();
        window.dispatchEvent(new CustomEvent('customerLanguageChanged', {
            detail: { lang: next }
        }));
        return next;
    }

    function t(key, vars) {
        const lang = getLang();
        let text = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.ky[key] || key;
        if (vars) {
            Object.keys(vars).forEach(function (k) {
                text = text.replace('{' + k + '}', String(vars[k]));
            });
        }
        return text;
    }

    function getItemName(item) {
        if (!item) return '';
        const lang = getLang();
        if (lang === 'ru') {
            return item.nameRu || item.name || item.nameKg || '';
        }
        return item.nameKg || item.name || item.nameRu || '';
    }

    function getCategory(item) {
        if (!item) return '';
        const lang = getLang();
        if (lang === 'ru') {
            return item.categoryRu || item.category || item.categoryKg || 'Другое';
        }
        return item.categoryKg || item.category || item.categoryRu || 'Башка';
    }

    function updatePillUi() {
        const lang = getLang();
        const kyBtn = document.getElementById('customerKyBtn') || document.getElementById('kyButton');
        const ruBtn = document.getElementById('customerRuBtn') || document.getElementById('ruButton');
        if (kyBtn) kyBtn.classList.toggle('active', lang === 'ky');
        if (ruBtn) ruBtn.classList.toggle('active', lang === 'ru');
    }

    function mountLangPill(options) {
        options = options || {};
        const existing = document.getElementById('customerLangPill');
        if (existing || document.getElementById('kyButton')) {
            if (existing && !existing.querySelector('#customerKyBtn')?.onclick) {
                const kyBtn = existing.querySelector('#customerKyBtn');
                const ruBtn = existing.querySelector('#customerRuBtn');
                if (kyBtn && !kyBtn.dataset.i18nBound) {
                    kyBtn.addEventListener('click', function () { setLang('ky'); });
                    kyBtn.dataset.i18nBound = '1';
                }
                if (ruBtn && !ruBtn.dataset.i18nBound) {
                    ruBtn.addEventListener('click', function () { setLang('ru'); });
                    ruBtn.dataset.i18nBound = '1';
                }
            }
            updatePillUi();
            return;
        }
        const theme = options.theme === 'family' ? ' lang-pill-family' : '';
        const pill = document.createElement('div');
        pill.id = 'customerLangPill';
        pill.className = 'lang-pill-fixed' + theme;
        pill.innerHTML =
            '<button type="button" id="customerKyBtn" class="lang-opt active">Кыргызча</button>' +
            '<span class="lang-sep">/</span>' +
            '<button type="button" id="customerRuBtn" class="lang-opt">Русский</button>';
        document.body.appendChild(pill);
        pill.querySelector('#customerKyBtn').addEventListener('click', function () {
            setLang('ky');
        });
        pill.querySelector('#customerRuBtn').addEventListener('click', function () {
            setLang('ru');
        });
        updatePillUi();
    }

    function onLanguageChange(fn) {
        window.addEventListener('customerLanguageChanged', function (e) {
            fn(e.detail.lang);
        });
    }

    window.CustomerI18n = {
        getLang: getLang,
        setLang: setLang,
        t: t,
        getItemName: getItemName,
        getCategory: getCategory,
        mountLangPill: mountLangPill,
        onLanguageChange: onLanguageChange,
        updatePillUi: updatePillUi
    };

    document.documentElement.lang = getLang() === 'ru' ? 'ru' : 'ky';
})();
