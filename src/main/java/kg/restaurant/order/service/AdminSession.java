package kg.restaurant.order.service;

public record AdminSession(
        AdminSession.Role role,
        Long restaurantId,
        String restaurantSlug
) {
    public enum Role {
        PLATFORM_ADMIN,
        PLATFORM_VIEW,
        RESTAURANT_ADMIN,
        RESTAURANT_VIEW
    }

    public boolean isReadOnly() {
        return role == Role.PLATFORM_VIEW || role == Role.RESTAURANT_VIEW;
    }

    public boolean isPlatform() {
        return role == Role.PLATFORM_ADMIN || role == Role.PLATFORM_VIEW;
    }

    public boolean isPlatformAdmin() {
        return role == Role.PLATFORM_ADMIN;
    }

    public boolean canAccessRestaurant(Long targetRestaurantId) {
        if (isPlatform()) {
            return true;
        }
        return targetRestaurantId != null && targetRestaurantId.equals(restaurantId);
    }

    public boolean canAccessRestaurantSlug(String slug) {
        if (isPlatform()) {
            return true;
        }
        if (slug == null || restaurantSlug == null) {
            return false;
        }
        return slug.equalsIgnoreCase(restaurantSlug);
    }
}
