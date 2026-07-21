package kg.restaurant.order.service;

import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.CustomerOrderRepository;
import kg.restaurant.order.repository.RestaurantRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PlatformService {

    private static final ZoneId BISHKEK_ZONE = ZoneId.of("Asia/Bishkek");
    private static final List<String> FINISHED_STATUSES = List.of("DELIVERED", "CANCELLED");

    private final RestaurantRepository restaurantRepository;
    private final CustomerOrderRepository orderRepository;
    private final CourierRepository courierRepository;

    public PlatformService(
            RestaurantRepository restaurantRepository,
            CustomerOrderRepository orderRepository,
            CourierRepository courierRepository
    ) {
        this.restaurantRepository = restaurantRepository;
        this.orderRepository = orderRepository;
        this.courierRepository = courierRepository;
    }

    public Map<String, Object> buildDashboard(Long restaurantId) {
        LocalDate today = LocalDate.now(BISHKEK_ZONE);
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime dayEnd = today.plusDays(1).atStartOfDay();

        List<Restaurant> restaurants = restaurantRepository.findAll();
        List<CustomerOrder> allOrders = orderRepository.findAll();
        List<CustomerOrder> scopedOrders = filterByRestaurant(allOrders, restaurantId);

        List<CustomerOrder> todayDelivered = scopedOrders.stream()
                .filter(order -> "DELIVERED".equals(order.getOrderStatus()))
                .filter(order -> isWithin(order.getCreatedAt(), dayStart, dayEnd))
                .toList();

        double todayRevenue = todayDelivered.stream()
                .mapToDouble(order -> order.getTotalPrice() == null ? 0 : order.getTotalPrice())
                .sum();

        long newOrders = scopedOrders.stream()
                .filter(order -> "NEW".equals(order.getOrderStatus()))
                .count();

        long activeOrders = scopedOrders.stream()
                .filter(order -> !FINISHED_STATUSES.contains(order.getOrderStatus()))
                .count();

        long activeCouriers = courierRepository.findByActiveTrueOrderByNameAsc().size();

        Map<Long, Restaurant> restaurantMap = restaurants.stream()
                .collect(Collectors.toMap(Restaurant::getId, r -> r, (a, b) -> a, LinkedHashMap::new));

        Map<Long, Map<String, Object>> perRestaurant = new LinkedHashMap<>();
        for (Restaurant restaurant : restaurants) {
            List<CustomerOrder> restaurantOrders = filterByRestaurant(allOrders, restaurant.getId());
            long restaurantNew = restaurantOrders.stream()
                    .filter(order -> "NEW".equals(order.getOrderStatus()))
                    .count();
            long restaurantActive = restaurantOrders.stream()
                    .filter(order -> !FINISHED_STATUSES.contains(order.getOrderStatus()))
                    .count();
            double restaurantRevenue = restaurantOrders.stream()
                    .filter(order -> "DELIVERED".equals(order.getOrderStatus()))
                    .filter(order -> isWithin(order.getCreatedAt(), dayStart, dayEnd))
                    .mapToDouble(order -> order.getTotalPrice() == null ? 0 : order.getTotalPrice())
                    .sum();

            Map<String, Object> stats = new HashMap<>();
            stats.put("newOrders", restaurantNew);
            stats.put("activeOrders", restaurantActive);
            stats.put("todayRevenue", restaurantRevenue);
            perRestaurant.put(restaurant.getId(), stats);
        }

        List<Map<String, Object>> recentOrders = scopedOrders.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(30)
                .map(order -> toOrderRow(order, restaurantMap.get(order.getRestaurantId())))
                .toList();

        List<Map<String, Object>> restaurantRows = new ArrayList<>();
        for (Restaurant restaurant : restaurants) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", restaurant.getId());
            row.put("name", restaurant.getName());
            row.put("slug", restaurant.getSlug());
            row.put("emoji", restaurant.getEmoji());
            row.put("accentColor", restaurant.getAccentColor());
            row.put("orderPrefix", restaurant.getOrderPrefix());
            row.put("active", restaurant.getActive());
            row.put("customerUrl", restaurant.getCustomerUrl());
            row.put("phone", restaurant.getPhone());
            row.put("address", restaurant.getAddress());
            row.putAll(perRestaurant.getOrDefault(restaurant.getId(), Map.of()));
            restaurantRows.add(row);
        }

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("todayOrders", todayDelivered.size());
        dashboard.put("todayRevenue", todayRevenue);
        dashboard.put("newOrders", newOrders);
        dashboard.put("activeOrders", activeOrders);
        dashboard.put("activeCouriers", activeCouriers);
        dashboard.put("restaurantCount", restaurants.size());
        dashboard.put("maxRestaurants", 6);
        dashboard.put("restaurants", restaurantRows);
        dashboard.put("recentOrders", recentOrders);
        dashboard.put("selectedRestaurantId", restaurantId);
        return dashboard;
    }

    private List<CustomerOrder> filterByRestaurant(List<CustomerOrder> orders, Long restaurantId) {
        if (restaurantId == null) {
            return orders;
        }
        return orders.stream()
                .filter(order -> restaurantId.equals(order.getRestaurantId()))
                .toList();
    }

    private boolean isWithin(LocalDateTime value, LocalDateTime start, LocalDateTime end) {
        return value != null && !value.isBefore(start) && value.isBefore(end);
    }

    private Map<String, Object> toOrderRow(CustomerOrder order, Restaurant restaurant) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", order.getId());
        row.put("restaurantId", order.getRestaurantId());
        row.put("restaurantName", restaurant == null ? "—" : restaurant.getName());
        row.put("restaurantEmoji", restaurant == null ? "🏪" : restaurant.getEmoji());
        row.put("restaurantColor", restaurant == null ? "#64748b" : restaurant.getAccentColor());
        row.put("displayOrderNumber", order.getDisplayOrderNumber());
        row.put("customerName", order.getCustomerName());
        row.put("phone", order.getPhone());
        row.put("address", order.getAddress());
        row.put("itemName", order.getItemName());
        row.put("totalPrice", order.getTotalPrice());
        row.put("orderStatus", order.getOrderStatus());
        row.put("paymentStatus", order.getPaymentStatus());
        row.put("receiptImagePath", order.getReceiptImagePath());
        row.put("createdAt", order.getCreatedAt());
        return row;
    }
}
