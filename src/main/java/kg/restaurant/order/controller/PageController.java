package kg.restaurant.order.controller;

import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.RestaurantRepository;
import kg.restaurant.order.service.RestaurantPageService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Set;

@Controller
public class PageController {

    private static final Set<String> RESERVED_SLUGS = Set.of(
            "courier", "kitchen", "ratlion", "ratlion-legacy", "admin", "admin-menu",
            "owner", "cafe", "platform", "cart", "item", "receipt", "restaurant",
            "menu", "api", "h2-console", "uploads", "r", "favicon.ico", "error"
    );

    private final RestaurantRepository restaurantRepository;
    private final RestaurantPageService restaurantPageService;

    public PageController(
            RestaurantRepository restaurantRepository,
            RestaurantPageService restaurantPageService
    ) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantPageService = restaurantPageService;
    }

    /** RATLION каталогу — бардыk ресторандар тең */
    @GetMapping("/")
    public String hub(Model model) {
        model.addAttribute("restaurants", restaurantRepository.findAll().stream()
                .filter(r -> r.getActive() == null || Boolean.TRUE.equals(r.getActive()))
                .sorted(java.util.Comparator.comparing(r -> r.getName() == null ? "" : r.getName()))
                .toList());
        return "hub";
    }

    /** Ресторан панели — тандоо же slug боюнча */
    @GetMapping("/kitchen")
    public String kitchenPicker(
            @RequestParam(required = false) String slug,
            Model model
    ) {
        if (slug != null && !slug.isBlank()) {
            return "redirect:/kitchen/" + restaurantPageService.normalizeSlug(slug);
        }
        return "kitchen";
    }

    @GetMapping("/kitchen/{slug}")
    public String kitchenPanel(@PathVariable String slug, Model model) {
        resolveKitchenPanel(slug, model);
        return "kitchen";
    }

    /** Кардар беттери — /{slug} (CSS/JS файлдарын кароо) */
    @GetMapping("/{slug:[a-z0-9-]+}")
    public String restaurantMenu(@PathVariable String slug, Model model) {
        if ("item".equalsIgnoreCase(slug)) {
            return "item-redirect";
        }
        if (isReservedSlug(slug)) {
            return "redirect:/";
        }
        return renderRestaurantPage(slug, model, "index");
    }

    @GetMapping("/{slug:[a-z0-9-]+}/")
    public String restaurantMenuTrailingSlash(@PathVariable String slug) {
        return "redirect:/" + restaurantPageService.normalizeSlug(slug);
    }

    @GetMapping("/{slug:[a-z0-9-]+}/cart")
    public String restaurantCart(@PathVariable String slug, Model model) {
        if (isReservedSlug(slug)) {
            return "redirect:/";
        }
        return renderRestaurantPage(slug, model, "cart");
    }

    @GetMapping("/{slug:[a-z0-9-]+}/item")
    public String restaurantItem(@PathVariable String slug, Model model) {
        if (isReservedSlug(slug)) {
            return "redirect:/";
        }
        return renderRestaurantPage(slug, model, "item");
    }

    @GetMapping("/{slug:[a-z0-9-]+}/receipt")
    public String restaurantReceipt(@PathVariable String slug, Model model) {
        if (isReservedSlug(slug)) {
            return "redirect:/";
        }
        return renderRestaurantPage(slug, model, "receipt");
    }

    @GetMapping("/{slug:[a-z0-9-]+}/order/{orderId}")
    public String orderStatus(
            @PathVariable String slug,
            @PathVariable Long orderId,
            Model model
    ) {
        if (isReservedSlug(slug)) {
            return "redirect:/";
        }
        Restaurant restaurant = restaurantPageService.findActiveBySlug(slug).orElse(null);
        if (restaurant == null) {
            return "redirect:/";
        }
        restaurantPageService.enrichModel(model, restaurant);
        model.addAttribute("orderId", orderId);
        return "order-status";
    }

    /** Эski /r/... шилтемелер */
    @GetMapping("/r/{slug}")
    public String legacyRestaurantMenu(@PathVariable String slug) {
        return "redirect:/" + restaurantPageService.normalizeSlug(slug);
    }

    @GetMapping("/r/{slug}/cart")
    public String legacyRestaurantCart(@PathVariable String slug) {
        return "redirect:/" + restaurantPageService.normalizeSlug(slug) + "/cart";
    }

    @GetMapping("/r/{slug}/item")
    public String legacyRestaurantItem(@PathVariable String slug, @RequestParam(required = false) Long id) {
        String base = "/" + restaurantPageService.normalizeSlug(slug) + "/item";
        return id != null ? "redirect:" + base + "?id=" + id : "redirect:" + base;
    }

    @GetMapping("/r/{slug}/receipt")
    public String legacyRestaurantReceipt(@PathVariable String slug) {
        return "redirect:/" + restaurantPageService.normalizeSlug(slug) + "/receipt";
    }

    @GetMapping("/r/{slug}/order/{orderId}")
    public String legacyOrderStatus(@PathVariable String slug, @PathVariable Long orderId) {
        return "redirect:/" + restaurantPageService.normalizeSlug(slug) + "/order/" + orderId;
    }

    @GetMapping("/cart")
    public String legacyCart() {
        return "redirect:/";
    }

    @GetMapping("/item")
    public String legacyItem() {
        return "item-redirect";
    }

    @GetMapping("/receipt")
    public String legacyReceipt() {
        return "redirect:/";
    }

    @GetMapping("/chaikhana-customer.css")
    public String legacyChaikhanaCss() {
        return "redirect:/burger-men-customer.css?v=2";
    }

    @GetMapping("/mburger-customer.css")
    public String mburgerCss() {
        return "redirect:/burger-men-customer.css?v=2";
    }

    @GetMapping("/bazar-korgon-customer.css")
    public String legacyBazarCss() {
        return "redirect:/default-customer.css";
    }

    @GetMapping("/bazar-korgon")
    public String legacyBazarKorgonMenu() {
        return "redirect:/ordo-cafe";
    }

    @GetMapping("/chaikhana")
    public String legacyChaikhanaMenu() {
        return "redirect:/mburger";
    }

    @GetMapping("/m-burger")
    public String mburgerShortcut() {
        return "redirect:/mburger";
    }

    @GetMapping("/femili")
    public String femiliShortcut() {
        return "redirect:/family";
    }

    @GetMapping("/femily")
    public String femilyShortcut() {
        return "redirect:/family";
    }

    @GetMapping("/ordo")
    public String ordoShortcut() {
        return "redirect:/ordo-cafe";
    }

    @GetMapping("/burgerman")
    public String burgermanShortcut() {
        return "redirect:/burger-men";
    }

    @GetMapping("/zhorolor-samsasy")
    public String zhorolorSamsasyShortcut() {
        return "redirect:/zhorolor";
    }

    @GetMapping("/restaurant/{slug}")
    public String legacyRestaurantPanel(@PathVariable String slug) {
        return "redirect:/kitchen/" + restaurantPageService.normalizeSlug(slug);
    }

    @GetMapping("/admin")
    public String admin(@RequestParam(required = false) String slug) {
        if (slug != null && !slug.isBlank()) {
            return "redirect:/kitchen/" + restaurantPageService.normalizeSlug(slug);
        }
        return "redirect:/kitchen";
    }

    @GetMapping("/admin-menu")
    public String adminMenu(@RequestParam(required = false) String slug) {
        if (slug != null && !slug.isBlank()) {
            return "redirect:/kitchen/" + restaurantPageService.normalizeSlug(slug) + "#menu";
        }
        return "redirect:/kitchen#menu";
    }

    @GetMapping("/owner")
    public String owner() {
        return "redirect:/ratlion";
    }

    @GetMapping("/courier")
    public String courier() {
        return "courier";
    }

    @GetMapping("/cafe")
    public String cafe(@RequestParam(required = false) String slug) {
        if (slug != null && !slug.isBlank()) {
            return "redirect:/kitchen/" + restaurantPageService.normalizeSlug(slug);
        }
        return "redirect:/kitchen";
    }

    @GetMapping("/platform")
    public String platform() {
        return "redirect:/ratlion";
    }

    @GetMapping("/ratlion")
    public String ratlion() {
        return "delivery";
    }

    @GetMapping("/ratlion-legacy")
    public String ratlionLegacy(
            @RequestParam(required = false) String slug,
            Model model
    ) {
        if (slug != null && !slug.isBlank()) {
            restaurantPageService.findActiveBySlug(slug)
                    .ifPresent(r -> restaurantPageService.enrichModel(model, r));
        }
        return "ratlion";
    }

    private void resolveKitchenPanel(String slug, Model model) {
        if (slug == null || slug.isBlank()) {
            return;
        }
        restaurantPageService.findBySlug(slug).ifPresentOrElse(
                r -> restaurantPageService.enrichModel(model, r),
                () -> restaurantPageService.enrichNotFound(model, slug)
        );
    }

    private boolean isReservedSlug(String slug) {
        return slug != null && RESERVED_SLUGS.contains(slug.toLowerCase(java.util.Locale.ROOT));
    }

    private String renderRestaurantPage(String slug, Model model, String template) {
        if ("femili".equalsIgnoreCase(slug)) {
            return "redirect:/family";
        }
        if ("bazar-korgon".equalsIgnoreCase(slug)) {
            return "redirect:/ordo-cafe";
        }
        Restaurant restaurant = restaurantPageService.findBySlug(slug).orElse(null);
        if (restaurant == null) {
            return "redirect:/";
        }
        if (Boolean.FALSE.equals(restaurant.getActive())) {
            return "redirect:/";
        }
        restaurantPageService.enrichModel(model, restaurant);
        return restaurantPageService.resolveCustomerTemplate(restaurant.getSlug(), template);
    }
}
