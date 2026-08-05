package kg.restaurant.order.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kg.restaurant.order.config.AdminAuthFilter;
import kg.restaurant.order.service.AdminAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
        boolean protectedMode = adminAuthService.isProtectionEnabled();
        boolean authenticated = !protectedMode || adminAuthService.isValidToken(extractToken(request));
        return ResponseEntity.ok(Map.of(
                "protected", protectedMode,
                "authenticated", authenticated
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> body,
            HttpServletResponse response
    ) {
        if (!adminAuthService.isProtectionEnabled()) {
            return ResponseEntity.ok(Map.of("ok", true, "protected", false));
        }

        String password = body.get("password");
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пароль жазыңыз"));
        }
        if (!adminAuthService.verifyPassword(password)) {
            if (adminAuthService.isProtectionEnabled() && !adminAuthService.isPasswordConfigured()) {
                return ResponseEntity.status(503).body(Map.of(
                        "error", "Админ пароль орнотулган эмес — Render'ге RATLION_ADMIN_PASSWORD коюңуз"
                ));
            }
            return ResponseEntity.status(401).body(Map.of("error", "Пароль туура эмес"));
        }

        String token = adminAuthService.createToken();
        var cookie = new jakarta.servlet.http.Cookie(AdminAuthFilter.COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60);
        cookie.setSecure(false);
        response.addCookie(cookie);

        return ResponseEntity.ok(Map.of("ok", true, "token", token));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
            @RequestBody(required = false) Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest request,
            HttpServletResponse response
    ) {
        String token = request.getHeader(AdminAuthFilter.HEADER_NAME);
        if (token == null || token.isBlank()) {
            var cookies = request.getCookies();
            if (cookies != null) {
                for (var cookie : cookies) {
                    if (AdminAuthFilter.COOKIE_NAME.equals(cookie.getName())) {
                        token = cookie.getValue();
                        break;
                    }
                }
            }
        }
        adminAuthService.revokeToken(token);

        var cleared = new jakarta.servlet.http.Cookie(AdminAuthFilter.COOKIE_NAME, "");
        cleared.setHttpOnly(true);
        cleared.setPath("/");
        cleared.setMaxAge(0);
        response.addCookie(cleared);

        return ResponseEntity.ok(Map.of("ok", true));
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
