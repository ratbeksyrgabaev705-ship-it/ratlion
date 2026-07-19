package kg.restaurant.order.controller;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.service.CourierActivityService;
import kg.restaurant.order.service.TelegramService;
import kg.restaurant.order.util.PhoneUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/couriers")
@CrossOrigin("*")
public class CourierController {

    private final CourierRepository courierRepository;
    private final CourierActivityService courierActivityService;
    private final TelegramService telegramService;

    public CourierController(
            CourierRepository courierRepository,
            CourierActivityService courierActivityService,
            TelegramService telegramService
    ) {
        this.courierRepository = courierRepository;
        this.courierActivityService = courierActivityService;
        this.telegramService = telegramService;
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

    /** Телефон менен кирүү — аккаунт бар болсо аты талап кылынбайт */
    @PostMapping("/login")
    public ResponseEntity<?> loginByPhone(@RequestBody Map<String, String> body) {
        String phone = PhoneUtils.normalize(body.get("phone"));
        String name = body.get("name");
        if (phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Телефон талап кылынат"));
        }

        var existing = courierRepository.findByPhone(phone);
        if (existing.isPresent()) {
            Courier courier = existing.get();
            if (name != null && !name.isBlank()) {
                courier.setName(name.trim());
            }
            if (!Boolean.TRUE.equals(courier.getActive())) {
                courier.setActive(true);
            }
            return ResponseEntity.ok(courierRepository.save(courier));
        }

        if (name == null || name.isBlank()) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "NOT_FOUND",
                    "message", "Жаңы курьер — атыңызды жазыңыз"
            ));
        }

        Courier courier = new Courier();
        courier.setName(name.trim());
        courier.setPhone(phone);
        courier.setTelegramChatId("phone:" + phone);
        courier.setActive(true);
        return ResponseEntity.ok(courierRepository.save(courier));
    }

    /** Телефон менен катталуу (Telegram жок тест үчүн) */
    @PostMapping("/register-phone")
    public ResponseEntity<Courier> registerByPhone(@RequestBody Map<String, String> body) {
        String phone = PhoneUtils.normalize(body.get("phone"));
        String name = body.get("name");
        if (phone.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        return courierRepository.findByPhone(phone)
                .map(existing -> {
                    if (name != null && !name.isBlank()) {
                        existing.setName(name.trim());
                    }
                    if (!Boolean.TRUE.equals(existing.getActive())) {
                        existing.setActive(true);
                    }
                    return ResponseEntity.ok(courierRepository.save(existing));
                })
                .orElseGet(() -> {
                    if (name == null || name.isBlank()) {
                        return ResponseEntity.badRequest().build();
                    }
                    Courier courier = new Courier();
                    courier.setName(name.trim());
                    courier.setPhone(phone);
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
        return ResponseEntity.ok(courierRepository.save(courier));
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
}
