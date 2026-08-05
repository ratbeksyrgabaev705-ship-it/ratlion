package kg.restaurant.order.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminAuthService {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthService.class);
    private static final long TOKEN_TTL_SECONDS = 24 * 60 * 60;

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, Instant> tokens = new ConcurrentHashMap<>();

    @Value("${ratlion.admin.password:}")
    private String adminPassword;

    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    public boolean isProtectionEnabled() {
        if (isProd()) {
            return true;
        }
        return adminPassword != null && !adminPassword.isBlank();
    }

    public boolean isPasswordConfigured() {
        return adminPassword != null && !adminPassword.isBlank();
    }

    public boolean verifyPassword(String password) {
        if (!isProtectionEnabled()) {
            return true;
        }
        if (!isPasswordConfigured()) {
            return false;
        }
        return adminPassword.equals(password);
    }

    public String createToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, Instant.now().plusSeconds(TOKEN_TTL_SECONDS));
        purgeExpired();
        return token;
    }

    public boolean isValidToken(String token) {
        if (!isProtectionEnabled()) {
            return true;
        }
        if (token == null || token.isBlank()) {
            return false;
        }
        Instant expiresAt = tokens.get(token);
        if (expiresAt == null) {
            return false;
        }
        if (Instant.now().isAfter(expiresAt)) {
            tokens.remove(token);
            return false;
        }
        return true;
    }

    public void revokeToken(String token) {
        if (token != null) {
            tokens.remove(token);
        }
    }

    public void logProtectionStatus() {
        if (isProd() && !isPasswordConfigured()) {
            log.error("RATLION_ADMIN_PASSWORD орнотулган эмес! /ratlion жана /kitchen ачылбайт — Render'ге пароль коюңуз");
        } else if (isProtectionEnabled()) {
            log.info("RATLION админ панели пароль менен корголгон");
        } else {
            log.warn("RATLION админ пароли орнотулган эмес — локалдуу режимде /ratlion ачык");
        }
    }

    private boolean isProd() {
        return activeProfiles != null && activeProfiles.contains("prod");
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        tokens.entrySet().removeIf(entry -> now.isAfter(entry.getValue()));
    }
}
