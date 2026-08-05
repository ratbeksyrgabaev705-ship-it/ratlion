package kg.restaurant.order.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kg.restaurant.order.service.AdminAuthService;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class AdminAuthFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "ratlion_admin_token";
    public static final String HEADER_NAME = "X-Ratlion-Admin-Token";

    private static final Set<String> ADMIN_PAGES = Set.of(
            "/ratlion", "/ratlion-legacy", "/kitchen", "/owner", "/platform", "/admin", "/admin-menu", "/cafe"
    );

    private static final Pattern ADMIN_PAGE_PREFIX = Pattern.compile("^/kitchen/.*");
    private static final Pattern ORDER_ID_PATH = Pattern.compile("^/orders/\\d+(/.*)?$");
    private static final Pattern COURIER_ORDER_PATH = Pattern.compile("^/orders/courier(/.*)?$");
    private static final Pattern MENU_MUTATION = Pattern.compile("^/menu/\\d+(/.*)?$");

    private final AdminAuthService adminAuthService;

    public AdminAuthFilter(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!adminAuthService.isProtectionEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = normalizePath(request.getRequestURI());
        if (isPublicPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!requiresAdmin(request.getMethod(), path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extractToken(request);
        if (adminAuthService.isValidToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (acceptsHtml(request)) {
            String next = URLEncoder.encode(path, StandardCharsets.UTF_8);
            response.sendRedirect("/admin-login?next=" + next);
            return;
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"Админ пароль талап кылынат\"}");
    }

    private boolean requiresAdmin(String method, String path) {
        if (ADMIN_PAGES.contains(path) || ADMIN_PAGE_PREFIX.matcher(path).matches()) {
            return true;
        }

        if (path.startsWith("/api/platform/")) {
            return true;
        }

        if (path.startsWith("/reports/")) {
            return true;
        }

        if (path.equals("/api/restaurants") && "GET".equalsIgnoreCase(method)) {
            return true;
        }
        if (path.startsWith("/api/restaurants/by-slug/")) {
            return true;
        }
        if (path.matches("^/api/restaurants/\\d+(/telegram/test)?$")) {
            return "GET".equalsIgnoreCase(method)
                    || "PUT".equalsIgnoreCase(method)
                    || "PATCH".equalsIgnoreCase(method)
                    || "DELETE".equalsIgnoreCase(method);
        }
        if (path.matches("^/api/restaurants/\\d+/accepting-orders$")) {
            return true;
        }
        if (path.equals("/api/restaurants") && !"GET".equalsIgnoreCase(method)) {
            return true;
        }

        if (path.equals("/orders") && "GET".equalsIgnoreCase(method)) {
            return true;
        }
        if (path.equals("/orders/new") || path.equals("/orders/history") || path.equals("/orders/active")) {
            return true;
        }
        if (path.equals("/orders/cafe") && "GET".equalsIgnoreCase(method)) {
            return true;
        }
        if (COURIER_ORDER_PATH.matcher(path).matches()) {
            return false;
        }
        if (ORDER_ID_PATH.matcher(path).matches()) {
            return isAdminOrderMutation(method, path);
        }

        if ("POST".equalsIgnoreCase(method) && path.equals("/menu")) {
            return true;
        }
        if (MENU_MUTATION.matcher(path).matches() && !"GET".equalsIgnoreCase(method)) {
            return true;
        }

        if (path.startsWith("/api/couriers")) {
            return isAdminCourierPath(method, path);
        }

        return false;
    }

    private boolean isAdminOrderMutation(String method, String path) {
        if ("GET".equalsIgnoreCase(method)) {
            return false;
        }
        return path.endsWith("/accept")
                || path.endsWith("/cook")
                || path.endsWith("/ready")
                || path.endsWith("/cancel")
                || path.endsWith("/courier");
    }

    private boolean isAdminCourierPath(String method, String path) {
        if (path.equals("/api/couriers/login")) {
            return false;
        }
        if (path.matches("^/api/couriers/\\d+$") && "GET".equalsIgnoreCase(method)) {
            return false;
        }
        if (path.matches("^/api/couriers/\\d+/online$")) {
            return false;
        }
        if (path.matches("^/api/couriers/\\d+/take$")) {
            return false;
        }
        return true;
    }

    private boolean isPublicPath(String path) {
        return path.equals("/")
                || path.equals("/admin-login")
                || path.startsWith("/api/admin/")
                || path.startsWith("/api/telegram/")
                || path.equals("/health")
                || path.startsWith("/uploads/")
                || path.endsWith(".css")
                || path.endsWith(".js")
                || path.endsWith(".ico")
                || path.endsWith(".png")
                || path.endsWith(".jpg")
                || path.endsWith(".webp")
                || path.endsWith(".svg");
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER_NAME);
        if (header != null && !header.isBlank()) {
            return header.trim();
        }
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private boolean acceptsHtml(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return accept != null && accept.contains("text/html");
    }

    private String normalizePath(String uri) {
        if (uri == null || uri.isBlank()) {
            return "/";
        }
        int query = uri.indexOf('?');
        if (query >= 0) {
            uri = uri.substring(0, query);
        }
        if (uri.length() > 1 && uri.endsWith("/")) {
            return uri.substring(0, uri.length() - 1);
        }
        return uri;
    }
}
