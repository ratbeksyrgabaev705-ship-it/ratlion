package kg.restaurant.order.service;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.model.CourierNotification;
import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.repository.CourierNotificationRepository;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.CustomerOrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CourierActivityService {

    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");
    private static final List<String> ACTIVE_STATUSES = List.of("COOKING", "READY", "GIVEN_TO_COURIER");

    private final CourierRepository courierRepository;
    private final CustomerOrderRepository orderRepository;
    private final CourierNotificationRepository notificationRepository;

    public CourierActivityService(
            CourierRepository courierRepository,
            CustomerOrderRepository orderRepository,
            CourierNotificationRepository notificationRepository
    ) {
        this.courierRepository = courierRepository;
        this.orderRepository = orderRepository;
        this.notificationRepository = notificationRepository;
    }

    public Map<String, Object> getDashboard() {
        List<Map<String, Object>> couriers = new ArrayList<>();
        LocalDateTime todayStart = LocalDate.now(BISHKEK).atStartOfDay();

        for (Courier courier : courierRepository.findByActiveTrueOrderByNameAsc()) {
            if (courier.getPhone() == null || courier.getPhone().isBlank()) {
                continue;
            }
            couriers.add(buildCourierRow(courier, todayStart));
        }

        couriers.sort(Comparator.comparingInt(c -> statusSort((String) c.get("activityStatus"))));

        List<Map<String, Object>> feed = buildGlobalFeed(couriers);
        List<Map<String, Object>> assignments = buildAssignments(couriers);
        List<Map<String, Object>> history = buildGlobalHistory();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("couriers", couriers);
        result.put("assignments", assignments);
        result.put("history", history);
        result.put("feed", feed);
        result.put("updatedAt", LocalDateTime.now(BISHKEK).toString());
        return result;
    }

    private Map<String, Object> buildCourierRow(Courier courier, LocalDateTime todayStart) {
        Long courierId = courier.getId();
        List<CustomerOrder> activeOrders = orderRepository.findByCourierIdAndOrderStatusInOrderByCreatedAtAsc(
                courierId, ACTIVE_STATUSES
        );
        long todayDelivered = orderRepository.countDeliveredSince(courierId, todayStart);
        long pendingOffers = notificationRepository.countByCourierIdAndTypeAndReadFlagFalse(courierId, "OFFER");

        String activityStatus = resolveStatus(activeOrders, pendingOffers);
        String activityLabel = resolveLabel(activityStatus, activeOrders, pendingOffers);

        List<Map<String, Object>> orderSummaries = activeOrders.stream()
                .map(this::toOrderSummary)
                .toList();

        List<Map<String, Object>> recentHistory = orderRepository
                .findTop8ByCourierIdAndOrderStatusOrderByDeliveredAtDesc(courierId, "DELIVERED")
                .stream()
                .map(o -> toHistoryEntry(o, courier.getName()))
                .toList();

        List<Map<String, Object>> timeline = buildTimeline(courierId, activeOrders);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("courierId", courierId);
        row.put("name", courier.getName());
        row.put("phone", courier.getPhone());
        row.put("activityStatus", activityStatus);
        row.put("activityLabel", activityLabel);
        row.put("todayDelivered", todayDelivered);
        row.put("pendingOffers", pendingOffers);
        row.put("activeOrders", orderSummaries);
        row.put("recentHistory", recentHistory);
        row.put("timeline", timeline);
        row.put("lastActivityAt", resolveLastActivity(timeline));
        return row;
    }

    private String resolveStatus(List<CustomerOrder> activeOrders, long pendingOffers) {
        if (activeOrders.stream().anyMatch(o -> "GIVEN_TO_COURIER".equals(o.getOrderStatus()))) {
            return "DELIVERING";
        }
        if (activeOrders.stream().anyMatch(o -> "READY".equals(o.getOrderStatus()))) {
            return "PICKUP";
        }
        if (activeOrders.stream().anyMatch(o -> "COOKING".equals(o.getOrderStatus()))) {
            return "WAITING";
        }
        if (pendingOffers > 0) {
            return "OFFER";
        }
        return "FREE";
    }

    private String resolveLabel(String status, List<CustomerOrder> activeOrders, long pendingOffers) {
        return switch (status) {
            case "DELIVERING" -> "Жеткирүүдө";
            case "PICKUP" -> "Алууга даяр";
            case "WAITING" -> "Даярдалууда";
            case "OFFER" -> pendingOffers > 1
                    ? pendingOffers + " жаңы сунуш"
                    : "Жаңы сунуш";
            default -> "Бош";
        };
    }

    private int statusSort(String status) {
        return switch (status) {
            case "DELIVERING" -> 0;
            case "PICKUP" -> 1;
            case "WAITING" -> 2;
            case "OFFER" -> 3;
            default -> 4;
        };
    }

    private Map<String, Object> toOrderSummary(CustomerOrder order) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("id", order.getId());
        summary.put("displayOrderNumber", order.getDisplayOrderNumber());
        summary.put("orderStatus", order.getOrderStatus());
        summary.put("address", order.getAddress());
        summary.put("customerName", order.getCustomerName());
        summary.put("restaurantId", order.getRestaurantId());
        summary.put("totalPrice", order.getTotalPrice());
        summary.put("acceptedAt", formatTime(coalesce(order.getCookingStartedAt(), order.getAcceptedAt())));
        summary.put("readyAt", formatTime(order.getReadyAt()));
        summary.put("courierAt", formatTime(order.getCourierAt()));
        summary.put("deliveredAt", formatTime(order.getDeliveredAt()));
        summary.put("steps", buildSteps(order));
        return summary;
    }

    private Map<String, Object> toHistoryEntry(CustomerOrder order, String courierName) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("orderId", order.getId());
        entry.put("displayOrderNumber", order.getDisplayOrderNumber());
        entry.put("courierId", order.getCourierId());
        entry.put("courierName", courierName);
        entry.put("customerName", order.getCustomerName());
        entry.put("address", order.getAddress());
        entry.put("totalPrice", order.getTotalPrice());
        entry.put("restaurantId", order.getRestaurantId());
        entry.put("acceptedAt", formatTime(coalesce(order.getCookingStartedAt(), order.getAcceptedAt())));
        entry.put("courierAt", formatTime(order.getCourierAt()));
        entry.put("deliveredAt", formatTime(order.getDeliveredAt()));
        entry.put("orderStatus", order.getOrderStatus());
        return entry;
    }

    private String formatTime(LocalDateTime at) {
        return at != null ? at.toString() : null;
    }

    private List<Map<String, Object>> buildSteps(CustomerOrder order) {
        String status = order.getOrderStatus();
        List<Map<String, Object>> steps = new ArrayList<>();

        steps.add(step("accept", "Кабыл", order.getCookingStartedAt() != null || order.getAcceptedAt() != null,
                coalesce(order.getCookingStartedAt(), order.getAcceptedAt()), status));
        steps.add(step("ready", "Даяр", order.getReadyAt() != null, order.getReadyAt(), status));
        steps.add(step("pickup", "Алуу", order.getCourierAt() != null, order.getCourierAt(), status));
        steps.add(step("deliver", "Берүү", "DELIVERED".equals(status), order.getDeliveredAt(), status));

        return steps;
    }

    private Map<String, Object> step(String key, String label, boolean done, LocalDateTime at, String orderStatus) {
        boolean current = isCurrentStep(key, orderStatus);
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("key", key);
        s.put("label", label);
        s.put("done", done);
        s.put("current", current);
        s.put("at", at != null ? at.toString() : null);
        return s;
    }

    private boolean isCurrentStep(String key, String orderStatus) {
        return switch (orderStatus) {
            case "COOKING" -> "accept".equals(key);
            case "READY" -> "ready".equals(key);
            case "GIVEN_TO_COURIER" -> "pickup".equals(key);
            case "DELIVERED" -> "deliver".equals(key);
            default -> false;
        };
    }

    private LocalDateTime coalesce(LocalDateTime a, LocalDateTime b) {
        return a != null ? a : b;
    }

    private List<Map<String, Object>> buildTimeline(Long courierId, List<CustomerOrder> activeOrders) {
        List<Map<String, Object>> events = new ArrayList<>();

        for (CustomerOrder order : activeOrders) {
            addOrderEvent(events, order.getCookingStartedAt(), "ACCEPT",
                    orderLabel(order) + " — кабыл алды", order.getId());
            addOrderEvent(events, order.getReadyAt(), "READY",
                    orderLabel(order) + " — даяр", order.getId());
            addOrderEvent(events, order.getCourierAt(), "PICKUP",
                    orderLabel(order) + " — алды", order.getId());
        }

        List<CourierNotification> notifications = notificationRepository
                .findTop8ByCourierIdOrderByCreatedAtDesc(courierId);
        for (CourierNotification n : notifications) {
            Map<String, Object> ev = new LinkedHashMap<>();
            ev.put("at", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
            ev.put("type", n.getType());
            ev.put("text", n.getMessage());
            ev.put("orderId", n.getOrderId());
            events.add(ev);
        }

        events.sort(Comparator.comparing(
                (Map<String, Object> e) -> (String) e.get("at"),
                Comparator.nullsLast(Comparator.reverseOrder())
        ));

        if (events.size() > 8) {
            return new ArrayList<>(events.subList(0, 8));
        }
        return events;
    }

    private void addOrderEvent(
            List<Map<String, Object>> events,
            LocalDateTime at,
            String type,
            String text,
            Long orderId
    ) {
        if (at == null) {
            return;
        }
        Map<String, Object> ev = new LinkedHashMap<>();
        ev.put("at", at.toString());
        ev.put("type", type);
        ev.put("text", text);
        ev.put("orderId", orderId);
        events.add(ev);
    }

    private String orderLabel(CustomerOrder order) {
        if (order.getDisplayOrderNumber() != null && !order.getDisplayOrderNumber().isBlank()) {
            return order.getDisplayOrderNumber();
        }
        return "#" + order.getId();
    }

    private String resolveLastActivity(List<Map<String, Object>> timeline) {
        return timeline.stream()
                .map(e -> (String) e.get("at"))
                .filter(at -> at != null && !at.isBlank())
                .findFirst()
                .orElse(null);
    }

    private List<Map<String, Object>> buildGlobalFeed(List<Map<String, Object>> couriers) {
        List<Map<String, Object>> feed = new ArrayList<>();

        for (Map<String, Object> courier : couriers) {
            String name = (String) courier.get("name");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> timeline = (List<Map<String, Object>>) courier.get("timeline");
            if (timeline == null) {
                continue;
            }
            for (Map<String, Object> ev : timeline) {
                Map<String, Object> row = new LinkedHashMap<>(ev);
                row.put("courierName", name);
                row.put("courierId", courier.get("courierId"));
                feed.add(row);
            }
        }

        feed.sort(Comparator.comparing(
                (Map<String, Object> e) -> (String) e.get("at"),
                Comparator.nullsLast(Comparator.reverseOrder())
        ));

        if (feed.size() > 20) {
            return new ArrayList<>(feed.subList(0, 20));
        }
        return feed;
    }

    private List<Map<String, Object>> buildAssignments(List<Map<String, Object>> couriers) {
        List<Map<String, Object>> assignments = new ArrayList<>();

        for (Map<String, Object> courier : couriers) {
            String name = (String) courier.get("name");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> activeOrders = (List<Map<String, Object>>) courier.get("activeOrders");
            if (activeOrders == null) {
                continue;
            }
            for (Map<String, Object> order : activeOrders) {
                Map<String, Object> row = new LinkedHashMap<>(order);
                row.put("courierId", courier.get("courierId"));
                row.put("courierName", name);
                row.put("courierPhone", courier.get("phone"));
                assignments.add(row);
            }
        }

        assignments.sort(Comparator.comparing(
                (Map<String, Object> a) -> (String) a.get("acceptedAt"),
                Comparator.nullsLast(Comparator.reverseOrder())
        ));
        return assignments;
    }

    private List<Map<String, Object>> buildGlobalHistory() {
        Map<Long, String> courierNames = new LinkedHashMap<>();
        for (Courier courier : courierRepository.findAll()) {
            courierNames.put(courier.getId(), courier.getName());
        }

        List<Map<String, Object>> history = new ArrayList<>();
        List<CustomerOrder> delivered = orderRepository
                .findTop40ByOrderStatusAndCourierIdIsNotNullOrderByDeliveredAtDesc("DELIVERED");

        for (CustomerOrder order : delivered) {
            String name = courierNames.getOrDefault(order.getCourierId(), "Курьер #" + order.getCourierId());
            history.add(toHistoryEntry(order, name));
        }

        return history;
    }
}
