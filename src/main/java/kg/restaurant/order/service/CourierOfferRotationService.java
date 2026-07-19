package kg.restaurant.order.service;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.CustomerOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class CourierOfferRotationService {

    private static final Logger log = LoggerFactory.getLogger(CourierOfferRotationService.class);
    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");
    static final int OFFER_SECONDS = 20;

    private static final List<String> BUSY_STATUSES = List.of("COOKING", "READY", "GIVEN_TO_COURIER");

    private final CourierRepository courierRepository;
    private final CustomerOrderRepository orderRepository;
    private final CourierNotificationService notificationService;
    private final TelegramService telegramService;

    public CourierOfferRotationService(
            CourierRepository courierRepository,
            CustomerOrderRepository orderRepository,
            CourierNotificationService notificationService,
            TelegramService telegramService
    ) {
        this.courierRepository = courierRepository;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
        this.telegramService = telegramService;
    }

    @Transactional
    public void startRotation(CustomerOrder order) {
        List<Courier> pool = buildCourierPool(order);
        if (pool.isEmpty()) {
            telegramService.sendToManager(
                    "⚠️ Курьер жок — " + notificationService.restaurantNameFor(order)
                            + ": " + notificationService.orderNumberFor(order)
            );
            return;
        }
        order.setOfferRotationIndex(0);
        sendOfferToIndex(order, pool, 0);
    }

    @Transactional
    public void rotateToNext(Long orderId) {
        CustomerOrder order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getCourierId() != null || !"COOKING".equals(order.getOrderStatus())) {
            return;
        }
        List<Courier> pool = buildCourierPool(order);
        if (pool.isEmpty()) {
            return;
        }
        int current = order.getOfferRotationIndex() != null ? order.getOfferRotationIndex() : 0;
        int next = (current + 1) % pool.size();
        order.setOfferRotationIndex(next);
        sendOfferToIndex(order, pool, next);
        log.info("OFFER rotation order #{} → courier {} ({}/{})",
                order.getId(), pool.get(next).getName(), next + 1, pool.size());
    }

    @Transactional
    public void stopRotation(CustomerOrder order) {
        order.setActiveOfferCourierId(null);
        order.setOfferExpiresAt(null);
        orderRepository.save(order);
    }

    @Scheduled(fixedRate = 3000)
    @Transactional
    public void processExpiredOffers() {
        LocalDateTime now = LocalDateTime.now(BISHKEK);
        List<CustomerOrder> expired = orderRepository
                .findByOrderStatusAndCourierIdIsNullAndActiveOfferCourierIdIsNotNullAndOfferExpiresAtBefore(
                        "COOKING", now
                );
        for (CustomerOrder order : expired) {
            rotateToNext(order.getId());
        }
    }

    private void sendOfferToIndex(CustomerOrder order, List<Courier> pool, int index) {
        Courier courier = pool.get(index);
        Long previousCourierId = order.getActiveOfferCourierId();
        if (previousCourierId != null && !previousCourierId.equals(courier.getId())) {
            notificationService.dismissOfferForCourier(order.getId(), previousCourierId);
        }

        order.setActiveOfferCourierId(courier.getId());
        order.setOfferExpiresAt(LocalDateTime.now(BISHKEK).plusSeconds(OFFER_SECONDS));
        orderRepository.save(order);
        notificationService.sendOfferToCourier(order, courier, OFFER_SECONDS);
    }

    /** Бош курьерлер алга — ресторандагы тарыхы барлар жакынкы */
    private List<Courier> buildCourierPool(CustomerOrder order) {
        List<Courier> couriers = courierRepository.findByActiveTrueOrderByNameAsc().stream()
                .filter(c -> c.getPhone() != null && !c.getPhone().isBlank())
                .toList();
        if (couriers.isEmpty()) {
            return List.of();
        }

        List<Courier> sorted = new ArrayList<>(couriers);
        Long restaurantId = order.getRestaurantId();
        sorted.sort(Comparator
                .comparingLong((Courier c) -> orderRepository.countByCourierIdAndOrderStatusIn(c.getId(), BUSY_STATUSES))
                .thenComparing(c -> !knowsRestaurant(c.getId(), restaurantId))
                .thenComparing(Courier::getId));
        return sorted;
    }

    private boolean knowsRestaurant(Long courierId, Long restaurantId) {
        if (restaurantId == null) {
            return false;
        }
        return orderRepository.existsByCourierIdAndRestaurantIdAndOrderStatus(
                courierId, restaurantId, "DELIVERED"
        );
    }
}
