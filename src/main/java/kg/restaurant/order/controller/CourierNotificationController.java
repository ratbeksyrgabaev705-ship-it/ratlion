package kg.restaurant.order.controller;

import kg.restaurant.order.model.CourierNotification;
import kg.restaurant.order.repository.CourierNotificationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/couriers")
@CrossOrigin("*")
public class CourierNotificationController {

    private final CourierNotificationRepository notificationRepository;

    public CourierNotificationController(CourierNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/notifications")
    public List<CourierNotification> list(
            @RequestParam Long courierId,
            @RequestParam(defaultValue = "false") boolean all
    ) {
        if (all) {
            return notificationRepository.findByCourierIdOrderByCreatedAtDesc(courierId);
        }
        return notificationRepository.findByCourierIdAndReadFlagFalseOrderByCreatedAtDesc(courierId);
    }

    @GetMapping("/notifications/count")
    public Map<String, Long> unreadCount(@RequestParam Long courierId) {
        return Map.of("count", notificationRepository.countByCourierIdAndReadFlagFalse(courierId));
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<CourierNotification> markRead(@PathVariable Long id) {
        return notificationRepository.findById(id)
                .map(n -> {
                    n.setReadFlag(true);
                    return ResponseEntity.ok(notificationRepository.save(n));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Map<String, Integer>> markAllRead(@RequestParam Long courierId) {
        List<CourierNotification> list = notificationRepository
                .findByCourierIdAndReadFlagFalseOrderByCreatedAtDesc(courierId);
        list.forEach(n -> n.setReadFlag(true));
        notificationRepository.saveAll(list);
        return ResponseEntity.ok(Map.of("marked", list.size()));
    }
}
