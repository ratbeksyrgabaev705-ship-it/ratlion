package kg.restaurant.order.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kg.restaurant.order.config.AdminAuthFilter;
import kg.restaurant.order.service.AdminAuthService;
import kg.restaurant.order.service.AdminSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @GetMapping("/session")
    public ResponseEntity<Map<String, Object>> session(HttpServletRequest request) {
        return ResponseEntity.ok(sessionPayload(extractToken(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> body,
            HttpServletResponse response
    ) {
        if (!adminAuthService.isProtectionEnabled()) {
            return ResponseEntity.ok(Map.of("ok", true, "protected", false, "role", "PLATFORM_ADMIN"));
        }

        String password = body.get("password");
        String slug = body.get("slug");
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пароль жазыңыз"));
        }

        var sessionOpt = adminAuthService.authenticate(password, slug);
        if (sessionOpt.isEmpty()) {
            if (!adminAuthService.isPasswordConfigured()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                        "error", "Админ пароль орнотулган эмес — RATLION → Орнотуулар"
                ));
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Пароль туура эмес"));
        }

        AdminSession session = sessionOpt.get();
        String token = adminAuthService.createToken(session);
        addTokenCookie(response, token);

        Map<String, Object> result = new LinkedHashMap<>(sessionPayload(token));
        result.put("ok", true);
        result.put("token", token);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        adminAuthService.revokeToken(extractToken(request));
        clearTokenCookie(response);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/passwords")
    public ResponseEntity<Map<String, Object>> listPasswords(HttpServletRequest request) {
        requirePlatformAdmin(request);
        return ResponseEntity.ok(adminAuthService.passwordStatus());
    }

    @PutMapping("/passwords/platform")
    public ResponseEntity<Map<String, Object>> updatePlatformPasswords(
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        requirePlatformAdmin(request);
        try {
            adminAuthService.updatePlatformPasswords(body.get("adminPassword"), body.get("viewPassword"));
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/passwords/restaurant/{id}")
    public ResponseEntity<Map<String, Object>> updateRestaurantPasswords(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        requirePlatformAdmin(request);
        try {
            adminAuthService.updateRestaurantPasswords(id, body.get("adminPassword"), body.get("viewPassword"));
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private AdminSession requirePlatformAdmin(HttpServletRequest request) {
        AdminSession session = adminAuthService.resolveSession(extractToken(request))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Кирүү кerek"));
        if (!session.isPlatformAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Толук укук кerek");
        }
        return session;
    }

    private Map<String, Object> sessionPayload(String token) {
        boolean protectedMode = adminAuthService.isProtectionEnabled();
        var sessionOpt = adminAuthService.resolveSession(token);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("protected", protectedMode);
        payload.put("authenticated", !protectedMode || sessionOpt.isPresent());
        if (sessionOpt.isPresent()) {
            AdminSession session = sessionOpt.get();
            payload.put("role", session.role().name());
            payload.put("readOnly", session.isReadOnly());
            payload.put("platform", session.isPlatform());
            if (session.restaurantId() != null) {
                payload.put("restaurantId", session.restaurantId());
            }
            if (session.restaurantSlug() != null) {
                payload.put("restaurantSlug", session.restaurantSlug());
            }
        }
        return payload;
    }

    private void addTokenCookie(HttpServletResponse response, String token) {
        var cookie = new jakarta.servlet.http.Cookie(AdminAuthFilter.COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60);
        cookie.setSecure(false);
        response.addCookie(cookie);
    }

    private void clearTokenCookie(HttpServletResponse response) {
        var cleared = new jakarta.servlet.http.Cookie(AdminAuthFilter.COOKIE_NAME, "");
        cleared.setHttpOnly(true);
        cleared.setPath("/");
        cleared.setMaxAge(0);
        response.addCookie(cleared);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(AdminAuthFilter.HEADER_NAME);
        if (header != null && !header.isBlank()) {
            return header.trim();
        }
        var cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (var cookie : cookies) {
            if (AdminAuthFilter.COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
