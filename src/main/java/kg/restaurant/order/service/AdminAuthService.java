package kg.restaurant.order.service;

import kg.restaurant.order.model.PlatformConfig;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.PlatformConfigRepository;
import kg.restaurant.order.repository.RestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminAuthService {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthService.class);
    private static final long TOKEN_TTL_SECONDS = 24 * 60 * 60;

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, TokenEntry> tokens = new ConcurrentHashMap<>();
    private final PlatformConfigRepository platformConfigRepository;
    private final RestaurantRepository restaurantRepository;
    private final RestaurantPageService restaurantPageService;
    private final PasswordEncoder passwordEncoder;

    @Value("${ratlion.admin.password:}")
    private String envAdminPassword;

    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    public AdminAuthService(
            PlatformConfigRepository platformConfigRepository,
            RestaurantRepository restaurantRepository,
            RestaurantPageService restaurantPageService,
            PasswordEncoder passwordEncoder
    ) {
        this.platformConfigRepository = platformConfigRepository;
        this.restaurantRepository = restaurantRepository;
        this.restaurantPageService = restaurantPageService;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean isProtectionEnabled() {
        if (isProd()) {
            return true;
        }
        return getPlatformConfig().hasAdminPassword()
                || (envAdminPassword != null && !envAdminPassword.isBlank());
    }

    public boolean isPasswordConfigured() {
        return getPlatformConfig().hasAdminPassword()
                || (envAdminPassword != null && !envAdminPassword.isBlank());
    }

    public Optional<AdminSession> authenticate(String password, String slug) {
        if (password == null || password.isBlank()) {
            return Optional.empty();
        }
        if (!isProtectionEnabled()) {
            return Optional.of(new AdminSession(AdminSession.Role.PLATFORM_ADMIN, null, null));
        }
        if (slug != null && !slug.isBlank()) {
            return authenticateRestaurant(password, slug.trim());
        }
        return authenticatePlatform(password);
    }

    public String createToken(AdminSession session) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, new TokenEntry(session, Instant.now().plusSeconds(TOKEN_TTL_SECONDS)));
        purgeExpired();
        return token;
    }

    public Optional<AdminSession> resolveSession(String token) {
        if (!isProtectionEnabled()) {
            return Optional.of(new AdminSession(AdminSession.Role.PLATFORM_ADMIN, null, null));
        }
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        TokenEntry entry = tokens.get(token);
        if (entry == null) {
            return Optional.empty();
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            tokens.remove(token);
            return Optional.empty();
        }
        return Optional.of(entry.session());
    }

    public boolean isValidToken(String token) {
        return resolveSession(token).isPresent();
    }

    public void revokeToken(String token) {
        if (token != null) {
            tokens.remove(token);
        }
    }

    @Transactional
    public PlatformConfig getPlatformConfig() {
        return platformConfigRepository.findById(1L).orElseGet(() -> {
            PlatformConfig config = new PlatformConfig();
            config.setId(1L);
            return platformConfigRepository.save(config);
        });
    }

    @Transactional
    public void updatePlatformPasswords(String adminPassword, String viewPassword) {
        PlatformConfig config = getPlatformConfig();
        if (adminPassword != null && !adminPassword.isBlank()) {
            if (adminPassword.length() < 4) {
                throw new IllegalArgumentException("Админ пароль кеминде 4 символ");
            }
            config.setAdminPasswordHash(passwordEncoder.encode(adminPassword));
        }
        if (viewPassword != null && !viewPassword.isBlank()) {
            if (viewPassword.length() < 4) {
                throw new IllegalArgumentException("Көрүү пароль кеминде 4 символ");
            }
            config.setViewPasswordHash(passwordEncoder.encode(viewPassword));
        }
        platformConfigRepository.save(config);
    }

    @Transactional
    public void updateRestaurantPasswords(Long restaurantId, String adminPassword, String viewPassword) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new IllegalArgumentException("Ресторан табылган жок"));
        if (adminPassword != null && !adminPassword.isBlank()) {
            if (adminPassword.length() < 4) {
                throw new IllegalArgumentException("Админ пароль кеминде 4 символ");
            }
            restaurant.setPanelPasswordHash(passwordEncoder.encode(adminPassword));
        }
        if (viewPassword != null && !viewPassword.isBlank()) {
            if (viewPassword.length() < 4) {
                throw new IllegalArgumentException("Көрүү пароль кеминде 4 символ");
            }
            restaurant.setPanelViewPasswordHash(passwordEncoder.encode(viewPassword));
        }
        restaurantRepository.save(restaurant);
    }

    public Map<String, Object> passwordStatus() {
        PlatformConfig platform = getPlatformConfig();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("platformAdminSet", platform.hasAdminPassword());
        result.put("platformViewSet", platform.hasViewPassword());
        result.put("restaurants", restaurantRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(r -> r.getName() == null ? "" : r.getName()))
                .map(r -> Map.of(
                        "id", r.getId(),
                        "name", r.getName() == null ? "" : r.getName(),
                        "slug", r.getSlug() == null ? "" : r.getSlug(),
                        "emoji", r.getEmoji() == null ? "🏪" : r.getEmoji(),
                        "adminSet", r.hasPanelPassword(),
                        "viewSet", r.hasPanelViewPassword()
                ))
                .toList());
        return result;
    }

    public void logProtectionStatus() {
        PlatformConfig config = getPlatformConfig();
        if (isProd() && !config.hasAdminPassword() && (envAdminPassword == null || envAdminPassword.isBlank())) {
            log.error("RATLION админ пароли орнотулган эмес — /ratlion → Орнотуулардан пароль коюңуз");
        } else if (isProtectionEnabled()) {
            log.info("RATLION панели пароль менен корголгон (DB + ресторан парольдери)");
        } else {
            log.warn("RATLION локалдуу режим — пароль өчük");
        }
    }

    @Transactional
    public void seedPlatformPasswordIfMissing() {
        PlatformConfig config = getPlatformConfig();
        if (!config.hasAdminPassword() && envAdminPassword != null && !envAdminPassword.isBlank()) {
            config.setAdminPasswordHash(passwordEncoder.encode(envAdminPassword));
            platformConfigRepository.save(config);
            log.info("RATLION админ пароли DB'ге env'ден сакталды");
        }
    }

    @Transactional
    public void ensureRestaurantPasswords() {
        for (Restaurant restaurant : restaurantRepository.findAll()) {
            if (restaurant.getSlug() == null || restaurant.getSlug().isBlank()) {
                continue;
            }
            boolean changed = false;
            if (!restaurant.hasPanelPassword()) {
                restaurant.setPanelPasswordHash(passwordEncoder.encode(defaultRestaurantPassword(restaurant.getSlug())));
                changed = true;
            }
            if (!restaurant.hasPanelViewPassword()) {
                restaurant.setPanelViewPasswordHash(passwordEncoder.encode(defaultRestaurantViewPassword(restaurant.getSlug())));
                changed = true;
            }
            if (changed) {
                restaurantRepository.save(restaurant);
            }
        }
    }

    public static String defaultRestaurantPassword(String slug) {
        return slug + "123";
    }

    public static String defaultRestaurantViewPassword(String slug) {
        return slug + "view";
    }

    private Optional<AdminSession> authenticatePlatform(String password) {
        PlatformConfig config = getPlatformConfig();
        if (config.hasAdminPassword() && passwordEncoder.matches(password, config.getAdminPasswordHash())) {
            return Optional.of(new AdminSession(AdminSession.Role.PLATFORM_ADMIN, null, null));
        }
        if (config.hasViewPassword() && passwordEncoder.matches(password, config.getViewPasswordHash())) {
            return Optional.of(new AdminSession(AdminSession.Role.PLATFORM_VIEW, null, null));
        }
        if (!config.hasAdminPassword() && envAdminPassword != null && envAdminPassword.equals(password)) {
            return Optional.of(new AdminSession(AdminSession.Role.PLATFORM_ADMIN, null, null));
        }
        return Optional.empty();
    }

    private Optional<AdminSession> authenticateRestaurant(String password, String slug) {
        String normalized = restaurantPageService.normalizeSlug(slug);
        Optional<Restaurant> restaurantOpt = restaurantPageService.findBySlug(normalized);
        if (restaurantOpt.isEmpty()) {
            return Optional.empty();
        }
        Restaurant restaurant = restaurantOpt.get();

        if (restaurant.hasPanelPassword() && passwordEncoder.matches(password, restaurant.getPanelPasswordHash())) {
            return Optional.of(new AdminSession(
                    AdminSession.Role.RESTAURANT_ADMIN,
                    restaurant.getId(),
                    restaurant.getSlug()
            ));
        }
        if (restaurant.hasPanelViewPassword() && passwordEncoder.matches(password, restaurant.getPanelViewPasswordHash())) {
            return Optional.of(new AdminSession(
                    AdminSession.Role.RESTAURANT_VIEW,
                    restaurant.getId(),
                    restaurant.getSlug()
            ));
        }

        Optional<AdminSession> platform = authenticatePlatform(password);
        if (platform.isPresent() && platform.get().isPlatform()) {
            return platform;
        }
        return Optional.empty();
    }

    private boolean isProd() {
        return activeProfiles != null && activeProfiles.contains("prod");
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        tokens.entrySet().removeIf(entry -> now.isAfter(entry.getValue().expiresAt()));
    }

    private record TokenEntry(AdminSession session, Instant expiresAt) {
    }
}
