package kg.restaurant.order.config;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.model.MenuItem;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.CustomerOrderRepository;
import kg.restaurant.order.repository.MenuItemRepository;
import kg.restaurant.order.repository.RestaurantRepository;
import kg.restaurant.order.util.PhoneUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class RestaurantDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(RestaurantDataInitializer.class);
    private static final int MAX_RESTAURANTS = 50;
    private static final java.util.Set<String> CANONICAL_SLUGS = java.util.Set.of(
            "aga-ini", "ordo-cafe", "mburger", "family", "burger-men", "zhorolor"
    );

    private final RestaurantRepository restaurantRepository;
    private final CustomerOrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final CourierRepository courierRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${courier.default.phone:0990912913}")
    private String defaultCourierPhone;

    @Value("${courier.default.name:Сыргый}")
    private String defaultCourierName;

    @Value("${courier.default.nickname:syrgy}")
    private String defaultCourierNickname;

    @Value("${courier.default.password:ratlion123}")
    private String defaultCourierPassword;

    public RestaurantDataInitializer(
            RestaurantRepository restaurantRepository,
            CustomerOrderRepository orderRepository,
            MenuItemRepository menuItemRepository,
            CourierRepository courierRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.restaurantRepository = restaurantRepository;
        this.orderRepository = orderRepository;
        this.menuItemRepository = menuItemRepository;
        this.courierRepository = courierRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        try {
            seedRestaurants();
            migrateFemiliToFamily();
            ensureRestaurantsActive();
            ensureFamilyRestaurant();
            ensureBurgerMenRestaurant();
            ensureOrdoCafeRestaurant();
            ensureMburgerRestaurant();
            ensureZhorolorRestaurant();
            ensureAgaIniRestaurant();
            migrateLegacyRestaurantSlugs();
            deactivateLegacyRestaurantSlugs();
            syncOrderPrefixes();
        syncAllCityAddresses();
            syncCustomerUrls();
            syncDefaultBankPaymentInfo();
            backfillRestaurantIds();
            seedFamilyMenuIfEmpty();
            seedOrdoCafeMenuIfEmpty();
            seedMburgerMenuIfEmpty();
            seedAgaIniMenuIfEmpty();
            seedBurgerMenMenuIfEmpty();
            seedZhorolorMenuIfEmpty();
            ensureFamilyPizzas();
            syncFamilyMenuImages();
            syncFamilyMenuDetails();
            ensureDefaultCourier();
        } catch (Exception e) {
            log.error("DB init failed — app will still start: {}", e.getMessage(), e);
        }
    }

    /** Тест курьери — /courier панелине ник + пароль менен кирет */
    private void ensureDefaultCourier() {
        String phone = PhoneUtils.normalize(defaultCourierPhone);
        if (phone.isBlank()) {
            return;
        }
        String nickname = defaultCourierNickname == null ? "" : defaultCourierNickname.trim().toLowerCase();
        courierRepository.findByPhone(phone).ifPresentOrElse(c -> {
            boolean changed = false;
            if (!Boolean.TRUE.equals(c.getActive())) {
                c.setActive(true);
                changed = true;
            }
            if (defaultCourierName != null && !defaultCourierName.isBlank()
                    && !defaultCourierName.equals(c.getName())) {
                c.setName(defaultCourierName);
                changed = true;
            }
            if (!nickname.isBlank() && (c.getNickname() == null || c.getNickname().isBlank())) {
                if (!courierRepository.existsByNicknameIgnoreCase(nickname)
                        || nickname.equalsIgnoreCase(c.getNickname())) {
                    c.setNickname(nickname);
                    changed = true;
                }
            }
            if (c.getPasswordHash() == null && defaultCourierPassword != null && !defaultCourierPassword.isBlank()) {
                c.setPasswordHash(passwordEncoder.encode(defaultCourierPassword));
                changed = true;
            }
            if (changed) {
                courierRepository.save(c);
            }
        }, () -> {
            if (nickname.isBlank() || defaultCourierPassword == null || defaultCourierPassword.isBlank()) {
                log.warn("Default courier not created — set courier.default.nickname and courier.default.password");
                return;
            }
            if (courierRepository.existsByNicknameIgnoreCase(nickname)) {
                log.warn("Default courier nickname '{}' already taken", nickname);
                return;
            }
            Courier courier = new Courier();
            courier.setName(defaultCourierName);
            courier.setPhone(phone);
            courier.setNickname(nickname);
            courier.setPasswordHash(passwordEncoder.encode(defaultCourierPassword));
            courier.setTelegramChatId("phone:" + phone);
            courier.setActive(true);
            courierRepository.save(courier);
            log.info("Created default courier: {} @{} ({})", defaultCourierName, nickname, phone);
        });
    }

    /** Эski DB: active=null болсо, ресторан көрүнбөй калат */
    private void ensureRestaurantsActive() {
        for (Restaurant r : restaurantRepository.findAll()) {
            boolean changed = false;
            if (r.getActive() == null) {
                r.setActive(true);
                changed = true;
            }
            if (r.getAcceptingOrders() == null) {
                r.setAcceptingOrders(true);
                changed = true;
            }
            if (changed) {
                restaurantRepository.save(r);
            }
        }
    }

    /** Family ресторан ар дайым бар болушu керек */
    private void ensureFamilyRestaurant() {
        Restaurant family = restaurantRepository.findBySlug("family").orElse(null);
        if (family == null) {
            family = buildRestaurant(
                    "FEMILY", "family", "F", "#5C1A1A", "FM",
                    "Даамдуу тамактар жана жагымдуу атмосфера сизди күтөт."
            );
            restaurantRepository.save(family);
            log.info("Created missing Family restaurant");
            return;
        }
        family.setActive(true);
        family.setAcceptingOrders(true);
        family.setName("FEMILY");
        family.setTagline("Даамдуу тамактар жана жагымдуу атмосфера сизди күтөт.");
        family.setLogoUrl("/restaurant/family/logo.png");
        family.setCustomerUrl("/family");
        family.setAddress("Базар-Коргон шаары");
        if (family.getAccentColor() == null || family.getAccentColor().isBlank()) {
            family.setAccentColor("#5C1A1A");
        }
        restaurantRepository.save(family);
    }

    private void ensureOrdoCafeRestaurant() {
        Restaurant ordo = restaurantRepository.findBySlug("ordo-cafe").orElse(null);
        if (ordo == null) {
            ordo = buildRestaurant(
                    "ОРДО КАФЕ", "ordo-cafe", "🍽", "#c9a227", "OD",
                    "Лагман, плов, самса"
            );
            ordo.setLogoUrl("/restaurant/ordo-cafe/logo.png");
            ordo.setBannerUrl("/restaurant/ordo-cafe/hero-bg.jpg");
            restaurantRepository.save(ordo);
            log.info("Created Ordo Cafe restaurant");
            return;
        }
        ordo.setActive(true);
        ordo.setAcceptingOrders(true);
        ordo.setName("ОРДО КАФЕ");
        ordo.setCustomerUrl("/ordo-cafe");
        ordo.setTagline("Лагман, плов, самса");
        ordo.setAddress("Базар-Коргон шаары");
        ordo.setLogoUrl("/restaurant/ordo-cafe/logo.png");
        ordo.setBannerUrl("/restaurant/ordo-cafe/hero-bg.jpg");
        ordo.setAccentColor("#c9a227");
        restaurantRepository.save(ordo);
    }

    private void ensureMburgerRestaurant() {
        restaurantRepository.findBySlug("chaikhana").ifPresent(old -> {
            if (restaurantRepository.findBySlug("mburger").isEmpty()) {
                old.setSlug("mburger");
                old.setName("MBURGER");
                old.setCustomerUrl("/mburger");
                old.setOrderPrefix("MB");
                old.setTagline("ДААМДУУ · ТЕЗ · САПАТТУУ");
                old.setEmoji("🍔");
                old.setAccentColor("#FF6B00");
                old.setLogoUrl("/restaurant/mburger/logo.png?v=2");
                old.setBannerUrl("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80");
                menuItemRepository.deleteAll(menuItemRepository.findByRestaurantId(old.getId()));
                restaurantRepository.save(old);
                log.info("Migrated chaikhana -> mburger");
            }
        });

        Restaurant mburger = restaurantRepository.findBySlug("mburger").orElse(null);
        if (mburger == null) {
            mburger = buildRestaurant(
                    "MBURGER", "mburger", "🍔", "#F5A623", "MB",
                    "ДААМДУУ · ТЕЗ · САПАТТУУ"
            );
            mburger.setLogoUrl("/restaurant/mburger/logo.png?v=2");
            mburger.setBannerUrl("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80");
            restaurantRepository.save(mburger);
            log.info("Created MBURGER restaurant");
            return;
        }
        mburger.setActive(true);
        mburger.setAcceptingOrders(true);
        mburger.setName("MBURGER");
        mburger.setCustomerUrl("/mburger");
        mburger.setTagline("ДААМДУУ · ТЕЗ · САПАТТУУ");
        mburger.setLogoUrl("/restaurant/mburger/logo.png?v=2");
        mburger.setAccentColor("#F5A623");
        mburger.setAddress("Базар-Коргон шаары");
        if (mburger.getOrderPrefix() == null || mburger.getOrderPrefix().isBlank()) {
            mburger.setOrderPrefix("MB");
        }
        restaurantRepository.save(mburger);
    }

    private void migrateLegacyRestaurantSlugs() {
        restaurantRepository.findBySlug("bazar-korgon").ifPresent(old -> {
            if (restaurantRepository.findBySlug("ordo-cafe").isEmpty()) {
                old.setSlug("ordo-cafe");
                old.setName("ОРДО");
                old.setTagline("Лагман, плов, самса");
                old.setCustomerUrl("/ordo-cafe");
                old.setOrderPrefix("OD");
                restaurantRepository.save(old);
                log.info("Migrated bazar-korgon slug to ordo-cafe");
            } else {
                old.setActive(false);
                restaurantRepository.save(old);
            }
        });
        restaurantRepository.findBySlug("chaikhana").ifPresent(old -> {
            old.setActive(false);
            restaurantRepository.save(old);
            log.info("Deactivated legacy chaikhana slug");
        });
    }

    /** Заказ номери префикстери: AI1, OD1, MB1, FM1, BM1, JS1 */
    private void syncOrderPrefixes() {
        Map<String, String> prefixes = Map.ofEntries(
                Map.entry("aga-ini", "AI"),
                Map.entry("ordo-cafe", "OD"),
                Map.entry("mburger", "MB"),
                Map.entry("family", "FM"),
                Map.entry("burger-men", "BM"),
                Map.entry("zhorolor", "JS")
        );
        for (Map.Entry<String, String> entry : prefixes.entrySet()) {
            restaurantRepository.findBySlug(entry.getKey()).ifPresent(restaurant -> {
                if (!entry.getValue().equals(restaurant.getOrderPrefix())) {
                    restaurant.setOrderPrefix(entry.getValue());
                    restaurantRepository.save(restaurant);
                    log.info("Order prefix for {} -> {}", entry.getKey(), entry.getValue());
                }
            });
        }
    }

    private void syncAllCityAddresses() {
        for (Restaurant r : restaurantRepository.findAll()) {
            if (Boolean.FALSE.equals(r.getActive())) {
                continue;
            }
            String addr = r.getAddress();
            if (addr == null || addr.isBlank() || "Бишкек".equals(addr)) {
                r.setAddress("Базар-Коргон шаары");
                restaurantRepository.save(r);
            }
        }
    }

    private void ensureBurgerMenRestaurant() {
        Restaurant bm = restaurantRepository.findBySlug("burger-men").orElse(null);
        if (bm == null) {
            bm = buildRestaurant(
                    "BURGERMAN", "burger-men", "🍔", "#E31837", "BM",
                    "Бургер · Картошка · Комбо · Соус"
            );
            bm.setAddress("Базар-Коргон");
            bm.setLogoUrl("/restaurant/burger-men/logo.svg");
            bm.setBannerUrl("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80");
            restaurantRepository.save(bm);
            return;
        }
        bm.setActive(true);
        bm.setAcceptingOrders(true);
        bm.setName("BURGERMAN");
        bm.setCustomerUrl("/burger-men");
        bm.setTagline("Бургер · Картошка · Комбо · Соус");
        bm.setAddress("Базар-Коргон");
        bm.setLogoUrl("/restaurant/burger-men/logo.svg");
        bm.setBannerUrl("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80");
        bm.setAccentColor("#E31837");
        restaurantRepository.save(bm);
    }

    private void ensureZhorolorRestaurant() {
        Restaurant zs = restaurantRepository.findBySlug("zhorolor").orElse(null);
        if (zs == null) {
            zs = buildRestaurant("ЖОРОЛОР САМСАСЫ", "zhorolor", "🥟", "#2D6A4F", "JS", "Самса жана выпечка");
            zs.setAddress("Базар-Коргон шаары");
            zs.setBannerUrl("/restaurant/zhorolor/banner.jpg");
            zs.setLogoUrl("/restaurant/zhorolor/logo.png");
            restaurantRepository.save(zs);
            return;
        }
        zs.setActive(true);
        zs.setAcceptingOrders(true);
        zs.setName("ЖОРОЛОР САМСАСЫ");
        zs.setCustomerUrl("/zhorolor");
        zs.setTagline("Самса жана выпечка");
        zs.setAddress("Базар-Коргон шаары");
        zs.setBannerUrl("/restaurant/zhorolor/banner.jpg");
        zs.setAccentColor("#2D6A4F");
        zs.setLogoUrl("/restaurant/zhorolor/logo.png");
        restaurantRepository.save(zs);
    }

    private void deactivateLegacyRestaurantSlugs() {
        java.util.Set<String> activeSlugs = CANONICAL_SLUGS;
        for (Restaurant r : restaurantRepository.findAll()) {
            String slug = r.getSlug();
            if (slug != null && !slug.isBlank() && !activeSlugs.contains(slug)) {
                if (!Boolean.FALSE.equals(r.getActive())) {
                    r.setActive(false);
                    restaurantRepository.save(r);
                    log.info("Deactivated legacy restaurant slug: {}", slug);
                }
            }
        }
    }

    private void ensureAgaIniRestaurant() {
        Restaurant aga = restaurantRepository.findBySlug("aga-ini").orElse(null);
        if (aga == null) {
            aga = buildRestaurant(
                    "АГА-ИНИ", "aga-ini", "AI", "#FF5A00", "AI",
                    "Суши · Пицца · Крылышки · Шаурма · Бургер"
            );
            aga.setAddress("Базар-Коргон");
            aga.setLogoUrl("/restaurant/aga-ini/logo.png");
            aga.setBannerUrl("https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&q=80");
            restaurantRepository.save(aga);
            log.info("Created Aga-Ini restaurant");
            return;
        }
        aga.setActive(true);
        aga.setAcceptingOrders(true);
        aga.setName("АГА-ИНИ");
        aga.setCustomerUrl("/aga-ini");
        aga.setTagline("Суши · Пицца · Крылышки · Шаурма · Бургер");
        aga.setLogoUrl("/restaurant/aga-ini/logo.png");
        aga.setBannerUrl("https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&q=80");
        aga.setAddress("Базар-Коргон");
        aga.setAccentColor("#FF5A00");
        restaurantRepository.save(aga);
    }

    private void seedAgaIniMenuIfEmpty() {
        Restaurant aga = restaurantRepository.findBySlug("aga-ini").orElse(null);
        if (aga == null || menuItemRepository.findByRestaurantId(aga.getId()).size() > 0) {
            return;
        }
        Long rid = aga.getId();
        List<MenuItem> menu = List.of(
                bkMenuItem(rid, "Плов", "Плов", "Плов", "Плов",
                        "Классикалык плов", "Классический плов", 380.0,
                        "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80"),
                bkMenuItem(rid, "Лагман", "Лагман", "Лагман", "Лагман",
                        "Уйгур лагманы", "Лагман с говядиной", 320.0,
                        "https://images.unsplash.com/photo-1617093727343-374698b8141?w=400&q=80"),
                bkMenuItem(rid, "Манты", "Манты", "Улуттук тамактар", "Национальные блюда",
                        "Буу манты", "Манты на пару", 400.0,
                        "https://images.unsplash.com/photo-1563245372-28a3042f9a9d?w=400&q=80"),
                bkMenuItem(rid, "Эtти самса", "Самса с мясом", "Самса", "Самса",
                        "Тандыр самса", "Самса с мясом", 90.0,
                        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80")
        );
        menuItemRepository.saveAll(menu);
        log.info("Seeded {} menu items for Aga-Ini (id={})", menu.size(), rid);
    }

    private void seedBurgerMenMenuIfEmpty() {
        Restaurant bm = restaurantRepository.findBySlug("burger-men").orElse(null);
        if (bm == null || menuItemRepository.findByRestaurantId(bm.getId()).size() > 0) {
            return;
        }
        seedBurgerStyleMenu(bm.getId(), "BURGERMAN");
    }

    private void seedMburgerMenuIfEmpty() {
        Restaurant mburger = restaurantRepository.findBySlug("mburger").orElse(null);
        if (mburger == null || menuItemRepository.findByRestaurantId(mburger.getId()).size() > 0) {
            return;
        }
        seedBurgerStyleMenu(mburger.getId(), "MBURGER");
    }

    private void seedBurgerStyleMenu(Long rid, String label) {
        List<MenuItem> menu = List.of(
                familyItem(rid, "Классик бургер", "Классик бургер", "Бургерлер", "Бургеры",
                        "Уй эти, салат, помидор, соус", "Говядина, салат, помидор, соус",
                        280.0, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80"),
                familyItem(rid, "Чизбургер", "Чизбургер", "Бургерлер", "Бургеры",
                        "Котлета, чеддер, соус", "Котлета, чеддер, соус",
                        320.0, "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80"),
                familyItem(rid, "Дабл бургер", "Дабл бургер", "Бургерлер", "Бургеры",
                        "2 котлета, сыр, соус", "2 котлеты, сыр, соус",
                        450.0, "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80"),
                familyItem(rid, "Ачуу бургер", "Острый бургер", "Бургерлер", "Бургеры",
                        "Ачуу соус, халапеньо, котлета", "Острый соус, халапеньо, котлета",
                        350.0, "https://images.unsplash.com/photo-1572802419224-296b0aaeb0ef?w=400&q=80"),
                familyItem(rid, "Комбо №1", "Комбо №1", "Комбо", "Комбо",
                        "Бургер + картошка + кола", "Бургер + картофель + кола",
                        520.0, "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80"),
                familyItem(rid, "Комбо №2", "Комбо №2", "Комбо", "Комбо",
                        "Чизбургер + фри + кола", "Чизбургер + фри + кола",
                        580.0, "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80"),
                familyItem(rid, "Шаурма эт", "Шаурма с мясом", "Шаурма", "Шаурма",
                        "Эт, салат, соус, лаваш", "Мясо, салат, соус, лаваш",
                        260.0, "https://images.unsplash.com/photo-1529006557810-274bdaa1d397?w=400&q=80"),
                familyItem(rid, "Шаурма кур", "Шаурма с курицей", "Шаурма", "Шаурма",
                        "Тоок эт, салат, соус", "Курица, салат, соус",
                        240.0, "https://images.unsplash.com/photo-1626700050165-9539482e8e8a?w=400&q=80"),
                familyItem(rid, "Картошка фри", "Картошка фри", "Снэктер", "Закуски",
                        "Хрустящая картошка", "Хрустящая картофель",
                        150.0, "https://images.unsplash.com/photo-1573080496219-bfa810296930?w=400&q=80"),
                familyItem(rid, "Наггетсы 6шт", "Наггетсы 6шт", "Снэктер", "Закуски",
                        "Тоок наггетсы", "Куриные наггетсы",
                        220.0, "https://images.unsplash.com/photo-1562967960-608f40b2d3a9?w=400&q=80"),
                familyItem(rid, "Кола 0.5л", "Кола 0.5л", "Суусундуктар", "Напитки",
                        "Газдалган суусундук", "Газированный напиток",
                        80.0, "https://images.unsplash.com/photo-1622483767028-3f66fbf638ea?w=400&q=80"),
                familyItem(rid, "Кетчуп", "Кетчуп", "Соустар", "Соусы",
                        "Томат соусу", "Томатный соус",
                        30.0, "https://images.unsplash.com/photo-1472476446867-f7eedbf9b2a5?w=400&q=80"),
                familyItem(rid, "Майонез", "Майонез", "Соустар", "Соусы",
                        "Классик майонез", "Классический майонез",
                        30.0, "https://images.unsplash.com/photo-1472476446867-f7eedbf9b2a5?w=400&q=80")
        );
        menuItemRepository.saveAll(menu);
        log.info("Seeded {} menu items for {} (id={})", menu.size(), label, rid);
    }

    private void seedOrdoCafeMenuIfEmpty() {
        Restaurant ordo = restaurantRepository.findBySlug("ordo-cafe").orElse(null);
        if (ordo == null) {
            return;
        }

        long existing = menuItemRepository.findByRestaurantId(ordo.getId()).size();
        if (existing > 0) {
            return;
        }

        Long rid = ordo.getId();
        List<MenuItem> menu = List.of(
                bkMenuItem(rid, "Уйгур лагман 0,7", "Уйгурский лагман 0,7", "Лагман", "Лагман",
                        "Колго чоюлган кесме, уй эти, жашылчалар", "Домашняя лапша с говядиной", 280.0,
                        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80"),
                bkMenuItem(rid, "Уйгур лагман 1,0", "Уйгурский лагман 1,0", "Лагман", "Лагман",
                        "Чоң порция уйгур лагманы", "Большая порция уйгурского лагмана", 350.0,
                        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80"),
                bkMenuItem(rid, "Лагман", "Лагман", "Лагман", "Лагман",
                        "Кесме, уй эти, жашылчалар", "Лапша с говядиной", 300.0,
                        "https://images.unsplash.com/photo-1617093727343-374698b8141?w=400&q=80"),
                bkMenuItem(rid, "Ганфан", "Ганфан", "Лагман", "Лагман",
                        "Кесме, күрүч, уй эти", "Лапша с рисом", 320.0,
                        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80"),
                bkMenuItem(rid, "Плов", "Плов", "Плов", "Плов",
                        "Күрүч, уй эти, сабиз, пияз", "Рис, говядина, морковь", 350.0,
                        "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80"),
                bkMenuItem(rid, "Этти самса", "Самса с мясом", "Самса", "Самса",
                        "Тандырда бышырылган этти самса", "Самса с мясом", 80.0,
                        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                bkMenuItem(rid, "Кашкын самса", "Самса с тыквой", "Самса", "Самса",
                        "Кашкын самса", "Самса с тыквой", 70.0,
                        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                bkMenuItem(rid, "Шорпа", "Шорпа", "Шорпо", "Шорпо",
                        "Уй эти, картошка, жашылчалар", "Говядина, картофель", 280.0,
                        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80"),
                bkMenuItem(rid, "Манты", "Манты", "Улуттук тамактар", "Национальные блюда",
                        "Бууга бышырылган манты", "Манты на пару", 380.0,
                        "https://images.unsplash.com/photo-1563245372-28a3042f9a9d?w=400&q=80"),
                bkMenuItem(rid, "Куурдак", "Куурдак", "Улуттук тамактар", "Национальные блюда",
                        "Эт, пияз, сарымсак", "Жареное мясо", 420.0,
                        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80"),
                bkMenuItem(rid, "Свежий салат", "Свежий салат", "Салат", "Салаты",
                        "Жашылчалар", "Свежие овощи", 150.0,
                        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80"),
                bkMenuItem(rid, "Тандыр нан", "Тандыр-лепёшка", "Нан", "Хлеб",
                        "Жаңы тандыр нан", "Свежая лепёшка", 50.0,
                        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80"),
                bkMenuItem(rid, "Жашыл чай", "Зелёный чай", "Ичимдиктер", "Напитки",
                        "Ысыk жашыл чай", "Зелёный чай", 50.0,
                        "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80"),
                bkMenuItem(rid, "Айран", "Айран", "Ичимдиктер", "Напитки",
                        "Сveжo айран", "Свежий айран", 80.0,
                        "https://images.unsplash.com/photo-1623065424889-aaaf9e2b7c4d?w=400&q=80")
        );

        menuItemRepository.saveAll(menu);
        log.info("Seeded {} menu items for Ordo Cafe (id={})", menu.size(), rid);
    }

    private void seedZhorolorMenuIfEmpty() {
        Restaurant zs = restaurantRepository.findBySlug("zhorolor").orElse(null);
        if (zs == null || menuItemRepository.findByRestaurantId(zs.getId()).size() > 0) {
            return;
        }
        Long rid = zs.getId();
        List<MenuItem> menu = List.of(
                familyItem(rid, "Этти самса", "Самса с мясом", "Самса", "Самса",
                        "Тандырда бышырылган этти самса", "Самса с говядиной",
                        80.0, "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                familyItem(rid, "Кашкын самса", "Самса с тыквой", "Самса", "Самса",
                        "Тatтуу кашкын самса", "Самса с тыквой",
                        70.0, "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                familyItem(rid, "Пияздуу самса", "Самса с луком", "Самса", "Самса",
                        "Пияз, зирень, май", "Лук, специи, масло",
                        65.0, "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                familyItem(rid, "Картоптуу самса", "Самса с картофелем", "Самса", "Самса",
                        "Картоп, пияз, зирень", "Картофель, лук, специи",
                        60.0, "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                familyItem(rid, "Ысыk этти самса", "Горячая самса с мясом", "Ысыk самса", "Горячая самса",
                        "Тандырдан жаңы чыккан ысыk самса", "Свежая горячая самса из тандыра",
                        85.0, "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                familyItem(rid, "Комбо самса 3шт", "Комбо самса 3 шт", "Ысыk самса", "Горячая самса",
                        "3 даана самса — ар кандай", "3 самсы — ассорти",
                        200.0, "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80"),
                familyItem(rid, "Бörek", "Бörek", "Выпечка", "Выпечка",
                        "Катмар тесто, май", "Слоёное тесто с маслом",
                        90.0, "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80"),
                familyItem(rid, "Тандыр нан", "Тандыр-лепёшка", "Выпечка", "Выпечка",
                        "Жаңы бышкан нан", "Свежая лепёшка",
                        50.0, "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80"),
                familyItem(rid, "Булочка", "Булочка", "Выпечка", "Выпечка",
                        "Жумшак булочка", "Мягкая булочка",
                        40.0, "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80"),
                familyItem(rid, "Жашыл чай", "Зелёный чай", "Ичимдиктер", "Напитки",
                        "Ысыk жашыл чай", "Горячий зелёный чай",
                        50.0, "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80"),
                familyItem(rid, "Айран", "Айран", "Ичимдиктер", "Напитки",
                        "Свеже айран", "Свежий айран",
                        80.0, "https://images.unsplash.com/photo-1623065424889-aaaf9e2b7c4d?w=400&q=80")
        );
        menuItemRepository.saveAll(menu);
        log.info("Seeded {} menu items for Zhorolor (id={})", menu.size(), rid);
    }

    private MenuItem bkMenuItem(
            Long restaurantId,
            String nameKg,
            String nameRu,
            String categoryKg,
            String categoryRu,
            String descKg,
            String descRu,
            double price,
            String imageUrl
    ) {
        MenuItem item = new MenuItem();
        item.setRestaurantId(restaurantId);
        item.setName(nameKg);
        item.setNameKg(nameKg);
        item.setNameRu(nameRu);
        item.setCategory(categoryKg);
        item.setCategoryKg(categoryKg);
        item.setCategoryRu(categoryRu);
        item.setDescriptionKg(descKg);
        item.setDescriptionRu(descRu);
        item.setIngredientsKg(descKg);
        item.setIngredientsRu(descRu);
        item.setPrice(price);
        item.setImage(imageUrl);
        item.setAvailable(true);
        item.setWeight(400);
        return item;
    }

    private void syncFamilyMenuDetails() {
        Restaurant family = restaurantRepository.findBySlug("family").orElse(null);
        if (family == null) {
            return;
        }

        java.util.Map<String, String[]> details = java.util.Map.ofEntries(
                entry("Пепперони",
                        "Кытырак камыр, пепперони колбасасы жана моцарелла сыры кошулган классикалык пицца.",
                        "Хрустящее тесто с пепперoni и моцареллой — классическая пицца.",
                        "Камыр, Пепперони колбасасы, Моцарелла сыры, Томатный соус, Орегано",
                        "Тесто, Пепперoni, Моцарелла, Томатный соус, Ореганo"),
                entry("Маргарита",
                        "Томат соус, свежая моцарелла и базилик — жеңил жана даамдуу классика.",
                        "Томатный соус, свежая моцарелла и базилик — лёгкая классика.",
                        "Камыр, Томатный соус, Моцарелла сыры, Базилик, Оливковое масло",
                        "Тесто, Томатный соус, Моцарелла, Базилик, Оливковое масло"),
                entry("4 Сыры",
                        "Төр түрдүү сырдын бай даамы — мoцарелла, пармезан, дор блю, чеддер.",
                        "Четыре вида сыра — мoцарелла, пармезан, дор блю, чеддер.",
                        "Камыр, Моцарелла сыры, Пармезан, Дор блю, Чеддер, Томатный соус",
                        "Тесто, Моцарелла, Пармезан, Дор блю, Чеддер, Томатный соус"),
                entry("Гавайская",
                        "Тatтуu ананас жана ветчина — жагымдуу комбинация.",
                        "Сладкий ананас и ветчина — приятное сочетание.",
                        "Камыр, Ветчина, Ананас, Моцарелла сыры, Томатный соус",
                        "Тесто, Ветчина, Ананас, Моцарелла, Томатный соус"),
                entry("BBQ Chicken",
                        "BBQ соустуу тоок эти, пияз жана мoцарелла.",
                        "Курица в BBQ соусе с луком и мoцареллой.",
                        "Камыр, Куриное филе, BBQ соус, Лук, Моцарелла сыры",
                        "Тесто, Куриное филе, BBQ соус, Лук, Моцарелла"),
                entry("Диабло",
                        "Кыянуу колбasa жана калемпир — оттуу даам сүйерлер үчүн.",
                        "Острая колбaca и перец — для любителей острого.",
                        "Камыр, Острая колбаса, Красный перец, Моцарелла сыры, Томатный соус",
                        "Тесто, Острая колбaca, Красный перец, Моцарелла, Томатный соус"),
                entry("Мясная",
                        "Бекон, ветчина, пепперони жана фарш — эти сүйерлер үчүн.",
                        "Бекон, ветчина, пепперoni и фарш — для мясоядов.",
                        "Камыр, Бекон, Ветчина, Пепперони, Говяжий фарш, Моцарелла сыры",
                        "Тесто, Бекон, Ветчина, Пепперoni, Говяжий фарш, Моцарелла"),
                entry("Вегетарианская",
                        "Жашылчалар, кozу карын жана мoцарелла — жеңил тамак.",
                        "Овощи, грибы и мoцарелла — лёгкое блюдо.",
                        "Камыр, Болгарский перец, Шампиньоны, Моцарелла сыры, Томатный соус",
                        "Тесто, Болгарский перец, Шампиньоны, Моцарелла, Томатный соус"),
                entry("4 сезона",
                        "Бир пиццада төр түрдүү начинка — ар бир бөлүгү өз даамында.",
                        "Четыре начинки на одной пицце — каждая часть со своим вкусом.",
                        "Камыр, Пепперони, Грибы, Артишоки, Моцарелла сыры, Томатный соус",
                        "Тесто, Пепперoni, Грибы, Артишоки, Моцарелла, Томатный соус"),
                entry("Тунец",
                        "Жаңы тунец, пияз жана мoцарелла — деңиз даамы.",
                        "Свежий тунец с луком и мoцареллой — морской вкус.",
                        "Камыр, Тунец, Лук, Моцарелла сыры, Томатный соус, Ореганo",
                        "Тесто, Тунец, Лук, Моцарелла, Томатный соус, Ореганo"),
                entry("Филадельфия",
                        "Лосось, сыр и огурец — классический ролл.",
                        "Лосось, сыр и огурец — классический ролл.",
                        "Лосось, Сливочный сыр, Огурец, Рис, Нori",
                        "Лосось, Сливочный сыр, Огурец, Рис, Нori"),
                entry("Калифорния",
                        "Кrab, авокадо и огурец — нежный ролл.",
                        "Кrab, авокадо и огурец — нежный ролл.",
                        "Кrab, Авокадо, Огурец, Рис, Икра тобико",
                        "Кrab, Авокадо, Огурец, Рис, Икра тобико"),
                entry("Темпура",
                        "Креветка в темпуре с рисом и nori.",
                        "Креветка в темпуре с рисом и nori.",
                        "Креветка, Темпурное тесто, Рис, Нori, Соус",
                        "Креветка, Темпурное тесто, Рис, Нori, Соус"),
                entry("Ribeye",
                        "Мраморная говядина ribeye — medium rare.",
                        "Мраморная говядина ribeye — medium rare.",
                        "Говядина ribeye, Соль, Перец, Чеснок, Масло",
                        "Говядина ribeye, Соль, Перец, Чеснок, Масло"),
                entry("T-Bone",
                        "Классический T-Bone стейк — сочный и ароматный.",
                        "Классический T-Bone стейк — сочный и ароматный.",
                        "Говядина T-Bone, Соль, Перец, Розмарин, Масло",
                        "Говядина T-Bone, Соль, Перец, Розмарин, Масло"),
                entry("Carbonara",
                        "Спагетти, бекон, сливки и пармезан.",
                        "Спагетти, бекон, сливки и пармезан.",
                        "Спагетти, Бекон, Сливки, Пармезан, Яичный желток",
                        "Спагетти, Бекон, Сливки, Пармезан, Яичный желток"),
                entry("Болоньезе",
                        "Классический болоньезе с говяжьим фаршом.",
                        "Классический болоньезе с гovяжьим фаршом.",
                        "Спагетти, Говяжий фарш, Томатный соус, Лук, Морковь",
                        "Спагетти, Говяжий фарш, Томатный соус, Лук, Морковь")
        );

        for (MenuItem item : menuItemRepository.findByRestaurantId(family.getId())) {
            String name = item.getNameKg() != null ? item.getNameKg() : item.getName();
            if (name == null || !details.containsKey(name)) {
                continue;
            }
            String[] d = details.get(name);
            item.setDescriptionKg(d[0]);
            item.setDescriptionRu(d[1]);
            item.setIngredientsKg(d[2]);
            item.setIngredientsRu(d[3]);
            item.setDescription(d[0]);
            item.setIngredients(d[2]);
            menuItemRepository.save(item);
        }
    }

    private static java.util.Map.Entry<String, String[]> entry(
            String name,
            String descKg,
            String descRu,
            String ingKg,
            String ingRu
    ) {
        return java.util.Map.entry(name, new String[] { descKg, descRu, ingKg, ingRu });
    }

    private void ensureFamilyPizzas() {
        Restaurant family = restaurantRepository.findBySlug("family").orElse(null);
        if (family == null) {
            return;
        }

        Long rid = family.getId();
        java.util.Set<String> existing = menuItemRepository.findByRestaurantId(rid).stream()
                .map(item -> item.getNameKg() != null ? item.getNameKg() : item.getName())
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());

        List<MenuItem> pizzas = List.of(
                familyItem(rid, "Пепперони", "Пепперони", "Пицца", "Пицца",
                        "Хрустящее тесто, пепперoni, моцарелла",
                        "Хрусталдай камыр, пепперони, моцарелла",
                        750.0, "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80"),
                familyItem(rid, "Маргарита", "Маргарита", "Пицца", "Пицца",
                        "Томат соус, моцарелла, базилик",
                        "Томат соус, моцарелла, базилик",
                        650.0, "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80"),
                familyItem(rid, "4 Сыры", "4 Сыры", "Пицца", "Пицца",
                        "Моцарелла, пармезан, дор блю, чеддер",
                        "Моцарелла, пармезан, дор блю, чеддер",
                        820.0, "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80"),
                familyItem(rid, "Гавайская", "Гавайская", "Пицца", "Пицца",
                        "Ветчина, ананас, моцарелла",
                        "Ветчина, ананас, моцарелла",
                        780.0, "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80"),
                familyItem(rid, "BBQ Чicken", "BBQ Chicken", "Пицца", "Пицца",
                        "Курица, BBQ соус, лук",
                        "Тоок, BBQ соус, пияз",
                        790.0, "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80"),
                familyItem(rid, "Диабло", "Диабло", "Пицца", "Пицца",
                        "Острая колбаса, перец, моцарелла",
                        "Кыянуу колбаса, калемпир, моцарелла",
                        770.0, "https://images.unsplash.com/photo-1571407970344-bc597e046769?w=400&q=80"),
                familyItem(rid, "Мясная", "Мясная", "Пицца", "Пицца",
                        "Бекон, ветчина, пепперoni, фарш",
                        "Бекон, ветчина, пепперони, фарш",
                        890.0, "https://images.unsplash.com/photo-1593504049359-74330189a345?w=400&q=80"),
                familyItem(rid, "Вегетарианская", "Вегетарианская", "Пицца", "Пицца",
                        "Овощи, грибы, моцарелла",
                        "Жашылчалар, козу карын, моцарелла",
                        680.0, "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&q=80"),
                familyItem(rid, "4 сезона", "4 сезона", "Пицца", "Пицца",
                        "Четыре вида начинки на одной пицце",
                        "Бир пиццада төр түрдүү начинка",
                        850.0, "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&q=80"),
                familyItem(rid, "Тунец", "Тунец", "Пицца", "Пицца",
                        "Тунец, лук, моцарелла",
                        "Тунец, пияз, моцарелла",
                        810.0, "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80")
        );

        List<MenuItem> toAdd = pizzas.stream()
                .filter(p -> !existing.contains(p.getNameKg()))
                .toList();

        if (!toAdd.isEmpty()) {
            menuItemRepository.saveAll(toAdd);
            log.info("Added {} pizza item(s) for FAMILY_PARK", toAdd.size());
        }
    }

    private void seedFamilyMenuIfEmpty() {
        Restaurant family = restaurantRepository.findBySlug("family").orElse(null);
        if (family == null) {
            return;
        }

        long existing = menuItemRepository.findByRestaurantId(family.getId()).size();
        if (existing > 0) {
            return;
        }

        Long rid = family.getId();
        List<MenuItem> demo = List.of(
                familyItem(rid, "Пепперони", "Пепперони", "Пицца", "Пицца",
                        "Хрустящее тесто, пепперoni, моцарелла",
                        "Хрусталдай камыр, пепперони колбасасы, моцарелла сыры",
                        750.0, "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80"),
                familyItem(rid, "Маргарита", "Маргарита", "Пицца", "Пицца",
                        "Томат соус, моцарелла, базилик",
                        "Томат соус, моцарелла, базилик",
                        650.0, "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80"),
                familyItem(rid, "4 Сыры", "4 Сыры", "Пицца", "Пицца",
                        "Моцарелла, пармезан, дор блю, чеддер",
                        "Моцарелла, пармезан, дор блю, чеддер",
                        820.0, "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80"),
                familyItem(rid, "Филадельфия", "Филадельфия", "Суши", "Суши",
                        "Лосось, сыр, огурец",
                        "Лосось, сыр, огурец",
                        690.0, "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=80"),
                familyItem(rid, "Калифорния", "Калифорния", "Суши", "Суши",
                        "Краб, авокадо, огурец",
                        "Краб, авокадо, огурец",
                        720.0, "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80"),
                familyItem(rid, "Темпура", "Темпура", "Суши", "Суши",
                        "Креветка в темпуре, рис, нори",
                        "Креветка в темпуре, рис, нори",
                        780.0, "https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=400&q=80"),
                familyItem(rid, "Ribeye", "Ribeye", "Стейк", "Стейк",
                        "Мраморная говядина, medium rare",
                        "Мрамордуу уй эти, medium rare",
                        1450.0, "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80"),
                familyItem(rid, "T-Bone", "T-Bone", "Стейк", "Стейк",
                        "Классический T-Bone стейк",
                        "Классикалык T-Bone стейк",
                        1650.0, "https://images.unsplash.com/photo-1600891964593-f84529778196?w=400&q=80"),
                familyItem(rid, "Carbonara", "Carbonara", "Паста", "Паста",
                        "Спагетти, бекон, сливки, пармезан",
                        "Спагетти, бекон, сливки, пармезан",
                        690.0, "https://images.unsplash.com/photo-1612874742237-652c76d6a886?w=400&q=80"),
                familyItem(rid, "Болоньезе", "Болоньезе", "Паста", "Паста",
                        "Фарш, томат, спагетти",
                        "Фарш, томат, спагетти",
                        720.0, "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80")
        );

        menuItemRepository.saveAll(demo);
        log.info("Seeded {} demo menu items for FAMILY_PARK (id={})", demo.size(), rid);
    }

    private void syncFamilyMenuImages() {
        Restaurant family = restaurantRepository.findBySlug("family").orElse(null);
        if (family == null) {
            return;
        }

        java.util.Map<String, String> images = java.util.Map.ofEntries(
                java.util.Map.entry("Пепперони", "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80"),
                java.util.Map.entry("Маргарита", "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80"),
                java.util.Map.entry("4 Сыры", "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80"),
                java.util.Map.entry("Гавайская", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80"),
                java.util.Map.entry("BBQ Chicken", "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80"),
                java.util.Map.entry("Диабло", "https://images.unsplash.com/photo-1571407970344-bc597e046769?w=400&q=80"),
                java.util.Map.entry("Мясная", "https://images.unsplash.com/photo-1593504049359-74330189a345?w=400&q=80"),
                java.util.Map.entry("Вегетарианская", "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&q=80"),
                java.util.Map.entry("4 сезона", "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&q=80"),
                java.util.Map.entry("Тунец", "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80"),
                java.util.Map.entry("Филадельфия", "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=80"),
                java.util.Map.entry("Калифорния", "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80"),
                java.util.Map.entry("Темпура", "https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=400&q=80"),
                java.util.Map.entry("Ribeye", "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80"),
                java.util.Map.entry("T-Bone", "https://images.unsplash.com/photo-1600891964593-f84529778196?w=400&q=80"),
                java.util.Map.entry("Carbonara", "https://images.unsplash.com/photo-1612874742237-652c76d6a886?w=400&q=80"),
                java.util.Map.entry("Болоньезе", "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80")
        );

        for (MenuItem item : menuItemRepository.findByRestaurantId(family.getId())) {
            String name = item.getNameKg() != null ? item.getNameKg() : item.getName();
            if (name == null || !images.containsKey(name)) {
                continue;
            }
            String url = images.get(name);
            if (url.equals(item.getImage())) {
                continue;
            }
            item.setImage(url);
            menuItemRepository.save(item);
        }
    }

    private MenuItem familyItem(
            Long restaurantId,
            String nameKg,
            String nameRu,
            String categoryKg,
            String categoryRu,
            String descKg,
            String descRu,
            double price,
            String imageUrl
    ) {
        MenuItem item = new MenuItem();
        item.setRestaurantId(restaurantId);
        item.setName(nameKg);
        item.setNameKg(nameKg);
        item.setNameRu(nameRu);
        item.setCategory(categoryKg);
        item.setCategoryKg(categoryKg);
        item.setCategoryRu(categoryRu);
        item.setDescriptionKg(descKg);
        item.setDescriptionRu(descRu);
        item.setIngredientsKg(descKg);
        item.setIngredientsRu(descRu);
        item.setPrice(price);
        item.setImage(imageUrl);
        item.setAvailable(true);
        item.setWeight(350);
        return item;
    }

    private void migrateFemiliToFamily() {
        restaurantRepository.findBySlug("femili").ifPresent(old -> {
            old.setName("Femili");
            old.setSlug("family");
            old.setEmoji("F");
            old.setAccentColor("#5C1A1A");
            old.setOrderPrefix("FM");
            old.setTagline("Даамдуу тамактар — үй-бүлөңүз үчүн");
            old.setCustomerUrl("/family");
            restaurantRepository.save(old);
            log.info("Migrated Femili → Family restaurant");
        });
    }

    private void seedRestaurants() {
        if (restaurantRepository.count() > 0) {
            return;
        }

        List<Restaurant> defaults = List.of(
                buildRestaurant("АГА-ИНИ", "aga-ini", "AI", "#FF5A00", "AI", "Суши · Пицца · Крылышки · Шаурма · Бургер"),
                buildRestaurant("ОРДО КАФЕ", "ordo-cafe", "🍽", "#c9a227", "OD", "Лагман, плов, самса"),
                buildRestaurant("FEMILY", "family", "F", "#5C1A1A", "FM", "Даамдуу тамактар"),
                buildRestaurant("BURGERMAN", "burger-men", "🍔", "#E31837", "BM", "Бургер · Картошка · Комбо · Соус"),
                buildRestaurant("ЖОРОЛОР САМСАСЫ", "zhorolor", "🥟", "#2D6A4F", "JS", "Самса жана выпечка")
        );

        restaurantRepository.saveAll(defaults);
        log.info("Seeded {} default restaurants", defaults.size());
    }

    private Restaurant buildRestaurant(
            String name,
            String slug,
            String emoji,
            String accentColor,
            String orderPrefix,
            String tagline
    ) {
        Restaurant restaurant = new Restaurant(name, slug, emoji, accentColor, orderPrefix);
        restaurant.setTagline(tagline);
        restaurant.setCustomerUrl("/" + slug);
        restaurant.setAddress("Базар-Коргон шаары");
        restaurant.setActive(true);
        return restaurant;
    }

    private void syncCustomerUrls() {
        for (Restaurant restaurant : restaurantRepository.findAll()) {
            if (restaurant.getSlug() == null || restaurant.getSlug().isBlank()) {
                continue;
            }
            String expected = "/" + restaurant.getSlug();
            boolean changed = false;
            if (!expected.equals(restaurant.getCustomerUrl())) {
                restaurant.setCustomerUrl(expected);
                changed = true;
            }
            if (changed) {
                restaurantRepository.save(restaurant);
            }
        }
    }

    private void syncDefaultBankPaymentInfo() {
        for (Restaurant restaurant : restaurantRepository.findAll()) {
            boolean changed = false;
            if (restaurant.getBankPhone() == null || restaurant.getBankPhone().isBlank()) {
                restaurant.setBankPhone("0600 600 828");
                changed = true;
            }
            if (restaurant.getBankRecipientName() == null || restaurant.getBankRecipientName().isBlank()) {
                restaurant.setBankRecipientName("Ратбек С.");
                changed = true;
            }
            if (changed) {
                restaurantRepository.save(restaurant);
            }
        }
    }

    private void backfillRestaurantIds() {
        java.util.List<Restaurant> active = restaurantRepository.findAll().stream()
                .filter(r -> r.getActive() == null || Boolean.TRUE.equals(r.getActive()))
                .toList();
        if (active.size() != 1) {
            return;
        }
        Long targetId = active.get(0).getId();
        int ordersUpdated = 0;
        int menuUpdated = 0;

        for (CustomerOrder order : orderRepository.findAll()) {
            if (order.getRestaurantId() == null) {
                order.setRestaurantId(targetId);
                orderRepository.save(order);
                ordersUpdated++;
            }
        }

        for (MenuItem item : menuItemRepository.findAll()) {
            if (item.getRestaurantId() == null) {
                item.setRestaurantId(targetId);
                menuItemRepository.save(item);
                menuUpdated++;
            }
        }

        if (ordersUpdated > 0 || menuUpdated > 0) {
            log.info(
                    "Backfilled restaurantId={} for {} order(s) and {} menu item(s) (single-restaurant legacy data)",
                    targetId,
                    ordersUpdated,
                    menuUpdated
            );
        }
    }

    public static int getMaxRestaurants() {
        return MAX_RESTAURANTS;
    }
}
