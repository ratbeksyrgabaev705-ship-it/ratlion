package kg.restaurant.order.service;

import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.util.Locale;
import java.util.Optional;

@Service
public class RestaurantPageService {

    private final RestaurantRepository restaurantRepository;

    public RestaurantPageService(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    public String normalizeSlug(String slug) {
        if (slug == null) {
            return "";
        }
        String normalized = slug.trim().toLowerCase(Locale.ROOT);
        if ("femili".equals(normalized) || "femily".equals(normalized)) {
            return "family";
        }
        if ("ordo".equals(normalized)) {
            return "ordo-cafe";
        }
        if ("burgerman".equals(normalized)) {
            return "burger-men";
        }
        if ("zhorolor-samsasy".equals(normalized)) {
            return "zhorolor";
        }
        if ("chaikhana".equals(normalized)) {
            return "mburger";
        }
        if ("mburger".equals(normalized) || "m-burger".equals(normalized)) {
            return "mburger";
        }
        return normalized;
    }

    public Optional<Restaurant> findBySlug(String slug) {
        String normalized = normalizeSlug(slug);
        if (normalized.isBlank()) {
            return Optional.empty();
        }
        return restaurantRepository.findBySlug(normalized);
    }

    public Optional<Restaurant> findActiveBySlug(String slug) {
        return findBySlug(slug)
                .filter(restaurant -> restaurant.getActive() == null
                        || Boolean.TRUE.equals(restaurant.getActive()));
    }

    public void enrichModel(Model model, Restaurant restaurant) {
        model.addAttribute("restaurantId", restaurant.getId());
        model.addAttribute("restaurantSlug", restaurant.getSlug());
        model.addAttribute("restaurantName", restaurant.getName());
        model.addAttribute("restaurantEmoji", restaurant.getEmoji());
        model.addAttribute("restaurantColor", restaurant.getAccentColor());
        model.addAttribute("restaurantTagline", restaurant.getTagline());
        model.addAttribute("restaurantLogo", restaurant.getLogoUrl());
        model.addAttribute("restaurantBanner", restaurant.getBannerUrl());
        model.addAttribute("restaurantBase", publicPath(restaurant));
        model.addAttribute("kitchenBase", kitchenPath(restaurant));
        model.addAttribute("customerTheme", resolveCustomerTheme(restaurant.getSlug()));
        model.addAttribute("customerCss", resolveCustomerCss(restaurant.getSlug()));
        model.addAttribute("restaurantAddress", restaurant.getAddress() != null ? restaurant.getAddress() : "");
        model.addAttribute("bankPhone", defaultBankPhone(restaurant.getBankPhone()));
        model.addAttribute("bankRecipientName", defaultBankRecipientName(restaurant.getBankRecipientName()));
        model.addAttribute("restaurantNotFound", false);
    }

    private String defaultBankPhone(String value) {
        return value == null || value.isBlank() ? "0600 600 828" : value.trim();
    }

    private String defaultBankRecipientName(String value) {
        return value == null || value.isBlank() ? "Ратбек С." : value.trim();
    }

    public void enrichNotFound(Model model, String slug) {
        model.addAttribute("restaurantNotFound", true);
        model.addAttribute("requestedSlug", normalizeSlug(slug));
    }

    public boolean usesFamilyTheme(String slug) {
        return usesFamilyLayout(slug);
    }

    public boolean usesFamilyLayout(String slug) {
        return "family".equals(normalizeSlug(slug));
    }

    public String resolveCustomerTemplate(String slug, String defaultTemplate) {
        String s = normalizeSlug(slug);
        if ("aga-ini".equals(s)) {
            return "aga-ini-" + defaultTemplate;
        }
        if ("burger-men".equals(s)) {
            return "burger-men-" + defaultTemplate;
        }
        if ("mburger".equals(s)) {
            return "burger-men-" + defaultTemplate;
        }
        if ("ordo-cafe".equals(s)) {
            return "ordo-cafe-" + defaultTemplate;
        }
        if ("zhorolor".equals(s)) {
            return "zhorolor-" + defaultTemplate;
        }
        if (usesFamilyLayout(slug)) {
            return "family-" + defaultTemplate;
        }
        return defaultTemplate;
    }

    private String resolveCustomerTheme(String slug) {
        String s = normalizeSlug(slug);
        if ("family".equals(s)) {
            return "family";
        }
        if ("aga-ini".equals(s)) {
            return "aga-ini";
        }
        if ("burger-men".equals(s)) {
            return "burger-men";
        }
        if ("mburger".equals(s)) {
            return "mburger";
        }
        if ("ordo-cafe".equals(s)) {
            return "ordo-cafe";
        }
        if ("zhorolor".equals(s)) {
            return "zhorolor";
        }
        return "default";
    }

    public String resolveCustomerCss(String slug) {
        return switch (normalizeSlug(slug)) {
            case "family" -> "/family-customer.css";
            case "aga-ini" -> "/aga-ini-customer.css?v=2";
            case "ordo-cafe" -> "/ordo-cafe-customer.css";
            case "mburger" -> "/burger-men-customer.css?v=6";
            case "burger-men" -> "/burger-men-customer.css?v=2";
            case "zhorolor" -> "/zhorolor-customer.css?v=10";
            default -> "/default-customer.css";
        };
    }

    public String publicPath(Restaurant restaurant) {
        return "/" + restaurant.getSlug();
    }

    public String kitchenPath(Restaurant restaurant) {
        return "/kitchen/" + restaurant.getSlug();
    }
}
