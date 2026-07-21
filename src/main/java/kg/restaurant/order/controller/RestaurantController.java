package kg.restaurant.order.controller;

import kg.restaurant.order.config.RestaurantDataInitializer;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.RestaurantRepository;
import kg.restaurant.order.service.TelegramService;
import kg.restaurant.order.service.RestaurantPageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/restaurants")
@CrossOrigin("*")
public class RestaurantController {

    private final RestaurantRepository restaurantRepository;
    private final TelegramService telegramService;
    private final RestaurantPageService restaurantPageService;

    public RestaurantController(
            RestaurantRepository restaurantRepository,
            TelegramService telegramService,
            RestaurantPageService restaurantPageService
    ) {
        this.restaurantRepository = restaurantRepository;
        this.telegramService = telegramService;
        this.restaurantPageService = restaurantPageService;
    }

    @GetMapping
    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    @GetMapping("/public")
    public List<Restaurant> getPublicRestaurants() {
        return restaurantRepository.findAll().stream()
                .filter(r -> r.getActive() == null || Boolean.TRUE.equals(r.getActive()))
                .sorted(java.util.Comparator.comparing(r -> r.getName() == null ? "" : r.getName()))
                .toList();
    }

    @GetMapping("/by-slug/{slug}")
    public ResponseEntity<Restaurant> getRestaurantBySlug(@PathVariable String slug) {
        return restaurantPageService.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Restaurant> getRestaurantById(@PathVariable Long id) {
        return restaurantRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createRestaurant(@RequestBody Restaurant restaurant) {
        if (restaurantRepository.count() >= RestaurantDataInitializer.getMaxRestaurants()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error",
                    "Максимум " + RestaurantDataInitializer.getMaxRestaurants() + " ресторан кошсо болот"
            ));
        }

        normalizeRestaurant(restaurant, true);
        if (restaurantRepository.existsBySlug(restaurant.getSlug())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",
                    "Мындай slug бар: " + restaurant.getSlug()
            ));
        }

        Restaurant saved = restaurantRepository.save(restaurant);
        telegramService.sendMessage(
                "🏢 Жаңы ресторан түзүлдү!\n"
                        + "Аты: " + saved.getName() + "\n"
                        + "ID: " + saved.getId()
        );
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRestaurant(
            @PathVariable Long id,
            @RequestBody Restaurant updatedRestaurant
    ) {
        Restaurant restaurant = restaurantRepository.findById(id).orElse(null);
        if (restaurant == null) {
            return ResponseEntity.notFound().build();
        }

        restaurant.setName(updatedRestaurant.getName());
        restaurant.setEmoji(updatedRestaurant.getEmoji());
        restaurant.setAccentColor(updatedRestaurant.getAccentColor());
        restaurant.setOrderPrefix(updatedRestaurant.getOrderPrefix());
        restaurant.setActive(updatedRestaurant.getActive());
        restaurant.setCustomerUrl(updatedRestaurant.getCustomerUrl());
        restaurant.setPhone(updatedRestaurant.getPhone());
        restaurant.setAddress(updatedRestaurant.getAddress());
        if (updatedRestaurant.getTagline() != null) {
            restaurant.setTagline(updatedRestaurant.getTagline());
        }
        if (updatedRestaurant.getLogoUrl() != null) {
            restaurant.setLogoUrl(updatedRestaurant.getLogoUrl());
        }
        if (updatedRestaurant.getBannerUrl() != null) {
            restaurant.setBannerUrl(updatedRestaurant.getBannerUrl());
        }
        if (updatedRestaurant.getAcceptingOrders() != null) {
            restaurant.setAcceptingOrders(updatedRestaurant.getAcceptingOrders());
        }
        if (updatedRestaurant.getOrdersPaused() != null) {
            restaurant.setOrdersPaused(updatedRestaurant.getOrdersPaused());
        }
        if (updatedRestaurant.getTelegramChatId() != null) {
            restaurant.setTelegramChatId(updatedRestaurant.getTelegramChatId().isBlank()
                    ? null
                    : updatedRestaurant.getTelegramChatId().trim());
        }
        if (updatedRestaurant.getBankPhone() != null) {
            restaurant.setBankPhone(updatedRestaurant.getBankPhone().isBlank()
                    ? null
                    : updatedRestaurant.getBankPhone().trim());
        }
        if (updatedRestaurant.getBankRecipientName() != null) {
            restaurant.setBankRecipientName(updatedRestaurant.getBankRecipientName().isBlank()
                    ? null
                    : updatedRestaurant.getBankRecipientName().trim());
        }

        if (updatedRestaurant.getSlug() != null && !updatedRestaurant.getSlug().isBlank()) {
            String slug = slugify(updatedRestaurant.getSlug());
            if (!slug.equals(restaurant.getSlug()) && restaurantRepository.existsBySlug(slug)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error",
                        "Мындай slug бар: " + slug
                ));
            }
            restaurant.setSlug(slug);
        }

        Restaurant saved = restaurantRepository.save(restaurant);

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("name", saved.getName());
        result.put("slug", saved.getSlug());
        result.put("emoji", saved.getEmoji());
        result.put("accentColor", saved.getAccentColor());
        result.put("orderPrefix", saved.getOrderPrefix());
        result.put("active", saved.getActive());
        result.put("customerUrl", saved.getCustomerUrl());
        result.put("phone", saved.getPhone());
        result.put("address", saved.getAddress());
        result.put("tagline", saved.getTagline());
        result.put("logoUrl", saved.getLogoUrl());
        result.put("bannerUrl", saved.getBannerUrl());
        result.put("acceptingOrders", saved.getAcceptingOrders());
        result.put("ordersPaused", saved.getOrdersPaused());
        result.put("telegramChatId", saved.getTelegramChatId());
        result.put("bankPhone", saved.getBankPhone());
        result.put("bankRecipientName", saved.getBankRecipientName());

        String tgChatId = saved.getTelegramChatId();
        if (tgChatId != null && !tgChatId.isBlank()) {
            var sendResult = telegramService.sendToChatWithResult(
                    tgChatId,
                    "✅ RATLION — " + saved.getName() + " Telegram байlandi!\n\n"
                            + "🆕 Кабыл алынган заказдар бул группага келет."
            );
            result.put("telegramSent", sendResult.success());
            if (!sendResult.success()) {
                result.put("telegramError", sendResult.error());
            }
        }

        return ResponseEntity.ok(result);
    }

    /** Telegram тест — ресторан группасына билдирүү жиберүү */
    @PostMapping("/{id}/telegram/test")
    public ResponseEntity<?> testTelegram(@PathVariable Long id) {
        Restaurant restaurant = restaurantRepository.findById(id).orElse(null);
        if (restaurant == null) {
            return ResponseEntity.notFound().build();
        }
        String chatId = restaurant.getTelegramChatId();
        if (chatId == null || chatId.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                    "error", "Telegram ID жок — алга сактаңыз"
            ));
        }
        var sendResult = telegramService.sendToChatWithResult(
                chatId,
                "🧪 RATLION тест — " + restaurant.getName() + "\n\n"
                        + "Эскертүүлөр бул группага келет ✅"
        );
        if (sendResult.success()) {
            return ResponseEntity.ok(java.util.Map.of("telegramSent", true));
        }
        return ResponseEntity.ok(java.util.Map.of(
                "telegramSent", false,
                "telegramError", sendResult.error()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRestaurant(@PathVariable Long id) {
        if (restaurantRepository.count() <= 1) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",
                    "Акыркы ресторанды өчүрүүгө болбойт"
            ));
        }

        Restaurant restaurant = restaurantRepository.findById(id).orElse(null);
        if (restaurant == null) {
            return ResponseEntity.notFound().build();
        }

        telegramService.sendMessage(
                "🗑️ Ресторан өчүрүлдү!\n"
                        + "Аты: " + restaurant.getName() + " (ID: " + id + ")"
        );
        restaurantRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void normalizeRestaurant(Restaurant restaurant, boolean generateSlug) {
        if (restaurant.getActive() == null) {
            restaurant.setActive(true);
        }
        if (restaurant.getEmoji() == null || restaurant.getEmoji().isBlank()) {
            restaurant.setEmoji("🏪");
        }
        if (restaurant.getAccentColor() == null || restaurant.getAccentColor().isBlank()) {
            restaurant.setAccentColor("#64748b");
        }
        if (restaurant.getOrderPrefix() == null || restaurant.getOrderPrefix().isBlank()) {
            restaurant.setOrderPrefix("R" + (restaurantRepository.count() + 1));
        }
        if (generateSlug) {
            if (restaurant.getSlug() == null || restaurant.getSlug().isBlank()) {
                restaurant.setSlug(slugify(restaurant.getName()));
            } else {
                restaurant.setSlug(slugify(restaurant.getSlug()));
            }
        }
    }

    private String slugify(String value) {
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\-]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
    }
}
