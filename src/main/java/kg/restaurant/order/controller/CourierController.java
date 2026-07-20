package kg.restaurant.order.controller;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.service.CourierActivityService;
import kg.restaurant.order.service.CourierOfferRotationService;
import kg.restaurant.order.service.TelegramService;
import kg.restaurant.order.util.PhoneUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/couriers")
@CrossOrigin("*")
public class CourierController {

    private final CourierRepository courierRepository;
    private final CourierActivityService courierActivityService;
    private final CourierOfferRotationService offerRotationService;
    private final TelegramService telegramService;
    private final PasswordEncoder passwordEncoder;

    public CourierController(
            CourierRepository courierRepository,
            CourierActivityService courierActivityService,
            CourierOfferRotationService offerRotationService,
            TelegramService telegramService,
            PasswordEncoder passwordEncoder
    ) {
        this.courierRepository = courierRepository;
        this.courierActivityService = courierActivityService;
        this.offerRotationService = offerRotationService;
        this.telegramService = telegramService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<Courier> getAll() {
        return courierRepository.findAll();
    }

    @GetMapping("/active")
    public List<Courier> getActive() {
        return courierRepository.findByActiveTrueOrderByNameAsc();
    }

    @GetMapping("/pending")
    public List<Courier> getPending() {
        return courierRepository.findByActiveFalseOrderByCreatedAtDesc();
    }

    /** RATLION: курьерлердин учурдагы кыймылы жана окуялар */
    @GetMapping("/activity")
    public Map<String, Object> activity() {
        return courierActivityService.getDashboard();
    }

    @GetMapping("/by-phone")
    public ResponseEntity<Courier> getByPhone(@RequestParam String phone) {
        String normalized = PhoneUtils.normalize(phone);
        if (normalized.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return courierRepository.findByPhone(normalized)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Courier> getById(@PathVariable Long id) {
        return courierRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Ник + пароль менен кирүү — аккаунт RATLION админден ачылат */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String nickname = normalizeNickname(body.get("nickname"));
        String password = body.get("password");
        if (nickname.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ник жана пароль талап кылынат"));
        }

        var courierOpt = courierRepository.findByNicknameIgnoreCase(nickname);
        if (courierOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Ник же пароль туура эмес"));
        }

        Courier courier = courierOpt.get();
        if (courier.getPasswordHash() == null || !passwordEncoder.matches(password, courier.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Ник же пароль туура эмес"));
        }
        if (!Boolean.TRUE.equals(courier.getActive())) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "Аккаунт активде эмес — менеджерге кайрылыңыз"
            ));
        }

        return ResponseEntity.ok(courier);
    }

    /** RATLION админ: курьер аккаунту (аты, телефон, ник, пароль) */
    @PostMapping("/register-phone")
    public ResponseEntity<?> registerByPhone(@RequestBody Map<String, String> body) {
        String phone = PhoneUtils.normalize(body.get("phone"));
        String name = body.get("name");
        String nickname = normalizeNickname(body.get("nickname"));
        String password = body.get("password");
        if (phone.isBlank() || name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Аты жана телефон талап кылынат"));
        }
        if (nickname.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ник жана пароль талап кылынат"));
        }
        if (password.length() < 4) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пароль кеминде 4 символ"));
        }

        var nicknameTaken = courierRepository.findByNicknameIgnoreCase(nickname);

        return courierRepository.findByPhone(phone)
                .map(existing -> {
                    if (nicknameTaken.isPresent() && !nicknameTaken.get().getId().equals(existing.getId())) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Бул ник эле колдонулуп жатат"));
                    }
                    existing.setName(name.trim());
                    existing.setNickname(nickname);
                    existing.setPasswordHash(passwordEncoder.encode(password));
                    if (!Boolean.TRUE.equals(existing.getActive())) {
                        existing.setActive(true);
                    }
                    Courier saved = courierRepository.save(existing);
                    notifyCourierActivated(saved);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> {
                    if (nicknameTaken.isPresent()) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Бул ник эле колдонулуп жатат"));
                    }
                    Courier courier = new Courier();
                    courier.setName(name.trim());
                    courier.setPhone(phone);
                    courier.setNickname(nickname);
                    courier.setPasswordHash(passwordEncoder.encode(password));
                    courier.setTelegramChatId("phone:" + phone);
                    courier.setActive(true);
                    Courier saved = courierRepository.save(courier);
                    return ResponseEntity.ok(saved);
                });
    }

    @PostMapping
    public ResponseEntity<Courier> create(@RequestBody Courier courier) {
        if (courier.getTelegramChatId() == null || courier.getTelegramChatId().isBlank()) {
            String phone = PhoneUtils.normalize(courier.getPhone());
            if (!phone.isBlank()) {
                courier.setPhone(phone);
                courier.setTelegramChatId("phone:" + phone);
            } else {
                return ResponseEntity.badRequest().build();
            }
        }

        if (courier.getPhone() != null && !courier.getPhone().isBlank()) {
            courier.setPhone(PhoneUtils.normalize(courier.getPhone()));
            return courierRepository.findByPhone(courier.getPhone())
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> saveNewCourier(courier));
        }

        if (courierRepository.existsByTelegramChatId(courier.getTelegramChatId())) {
            return ResponseEntity.badRequest().build();
        }

        return saveNewCourier(courier);
    }

    private ResponseEntity<Courier> saveNewCourier(Courier courier) {
        if (courier.getActive() == null) {
            courier.setActive(true);
        }
        Courier saved = courierRepository.save(courier);
        if (Boolean.TRUE.equals(saved.getActive()) && saved.getTelegramChatId() != null
                && !saved.getTelegramChatId().startsWith("phone:")) {
            notifyCourierActivated(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<Courier> activate(@PathVariable Long id) {
        Courier courier = courierRepository.findById(id).orElse(null);
        if (courier == null) {
            return ResponseEntity.notFound().build();
        }

        courier.setActive(true);
        Courier saved = courierRepository.save(courier);
        notifyCourierActivated(saved);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Courier> deactivate(@PathVariable Long id) {
        Courier courier = courierRepository.findById(id).orElse(null);
        if (courier == null) {
            return ResponseEntity.notFound().build();
        }

        courier.setActive(false);
        courier.setOnline(false);
        offerRotationService.courierWentOffline(id);
        return ResponseEntity.ok(courierRepository.save(courier));
    }

    /** Курьер линияга чыгуу / линиядан чыгуу */
    @PutMapping("/{id}/online")
    public ResponseEntity<?> setOnline(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body
    ) {
        Courier courier = courierRepository.findById(id).orElse(null);
        if (courier == null) {
            return ResponseEntity.notFound().build();
        }
        if (!Boolean.TRUE.equals(courier.getActive())) {
            return ResponseEntity.status(403).body(Map.of("error", "Аккаунт активде эмес"));
        }

        Boolean online = body.get("online");
        if (online == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "online талап кылынат"));
        }

        if (!online) {
            offerRotationService.courierWentOffline(id);
        }
        courier.setOnline(online);
        return ResponseEntity.ok(courierRepository.save(courier));
    }

    /** Курьердин Telegram chat ID — билдирүүлөр үчүн */
    @PutMapping("/{id}/telegram")
    public ResponseEntity<?> updateTelegram(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        Courier courier = courierRepository.findById(id).orElse(null);
        if (courier == null) {
            return ResponseEntity.notFound().build();
        }

        String chatId = body.get("telegramChatId");
        if (chatId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "telegramChatId талап кылынат"));
        }
        chatId = chatId.trim();

        if (chatId.isBlank()) {
            String phone = PhoneUtils.normalize(courier.getPhone());
            courier.setTelegramChatId(phone.isBlank() ? null : "phone:" + phone);
        } else {
            if (courierRepository.existsByTelegramChatId(chatId)
                    && !chatId.equals(courier.getTelegramChatId())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Бул Telegram ID башка курьerde колдонулуп жатат"
                ));
            }
            courier.setTelegramChatId(chatId);
        }

        Courier saved = courierRepository.save(courier);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("name", saved.getName());
        result.put("phone", saved.getPhone());
        result.put("nickname", saved.getNickname());
        result.put("telegramChatId", saved.getTelegramChatId());
        result.put("active", saved.getActive());
        result.put("online", saved.getOnline());
        result.put("createdAt", saved.getCreatedAt());

        if (chatId != null && !chatId.isBlank() && !chatId.startsWith("phone:")) {
            var sendResult = telegramService.sendToChatWithResult(
                    chatId,
                    "✅ RATLION — Telegram байlandi!\n\n"
                            + "👤 " + safeName(saved.getName()) + "\n"
                            + "🛵 Жаңы заказ сунуштары бул жерге келет.\n"
                            + "→ /courier"
            );
            result.put("telegramSent", sendResult.ok());
            if (!sendResult.ok()) {
                result.put("telegramError", sendResult.error());
            }
        }

        return ResponseEntity.ok(result);
    }

    /** Telegram тест билдирүү — ID туурабы текшерүү */
    @PostMapping("/{id}/telegram/test")
    public ResponseEntity<?> testTelegram(@PathVariable Long id) {
        Courier courier = courierRepository.findById(id).orElse(null);
        if (courier == null) {
            return ResponseEntity.notFound().build();
        }
        String chatId = courier.getTelegramChatId();
        if (chatId == null || chatId.isBlank() || chatId.startsWith("phone:")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Telegram ID жок — алга ID сактаңыз"
            ));
        }
        var sendResult = telegramService.sendToChatWithResult(
                chatId,
                "🧪 RATLION тест\n\n"
                        + "👤 " + safeName(courier.getName()) + "\n"
                        + "Эскертүүлөр бул аккаунтка келет ✅"
        );
        if (sendResult.ok()) {
            return ResponseEntity.ok(Map.of("telegramSent", true, "message", "Тест билдирүү жиберилди"));
        }
        return ResponseEntity.ok(Map.of(
                "telegramSent", false,
                "telegramError", sendResult.error()
        ));
    }

    private String safeName(String name) {
        return name == null || name.isBlank() ? "Курьер" : name.trim();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!courierRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        courierRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void notifyCourierActivated(Courier courier) {
        telegramService.sendToCourier(
                courier.getTelegramChatId(),
                "✅ Сиз RATLION курьери катары катталдыңыз!\n\n"
                        + "Жеткирүү заказдары бул жерге келет.\n"
                        + "Веб-панель: /courier"
        );
    }

    private String normalizeNickname(String nickname) {
        if (nickname == null) {
            return "";
        }
        return nickname.trim().toLowerCase();
    }
}
