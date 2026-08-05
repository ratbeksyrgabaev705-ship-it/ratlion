package kg.restaurant.order.controller;

import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.CourierNotificationRepository;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.CustomerOrderRepository;
import kg.restaurant.order.repository.RestaurantRepository;
import kg.restaurant.order.service.CourierNotificationService;
import kg.restaurant.order.service.CourierOfferRotationService;
import kg.restaurant.order.service.OrderVerificationService;
import kg.restaurant.order.service.ReceiptStorageService;
import kg.restaurant.order.service.TelegramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/orders")
@CrossOrigin("*")
public class CustomerOrderController {

    private static final Logger log = LoggerFactory.getLogger(CustomerOrderController.class);

    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");

    private static final List<String> CAFE_STATUSES = List.of(
            "ACCEPTED", "COOKING", "READY", "GIVEN_TO_COURIER"
    );

    private static final List<String> COURIER_STATUSES = List.of(
            "GIVEN_TO_COURIER"
    );

    private final CustomerOrderRepository repo;
    private final CourierRepository courierRepository;
    private final CourierNotificationRepository notificationRepository;
    private final RestaurantRepository restaurantRepository;
    private final ReceiptStorageService receiptStorageService;
    private final TelegramService telegramService;
    private final CourierNotificationService courierNotificationService;
    private final CourierOfferRotationService courierOfferRotationService;
    private final OrderVerificationService orderVerificationService;

    public CustomerOrderController(
            CustomerOrderRepository repo,
            CourierRepository courierRepository,
            CourierNotificationRepository notificationRepository,
            RestaurantRepository restaurantRepository,
            ReceiptStorageService receiptStorageService,
            TelegramService telegramService,
            CourierNotificationService courierNotificationService,
            CourierOfferRotationService courierOfferRotationService,
            OrderVerificationService orderVerificationService
    ) {
        this.repo = repo;
        this.courierRepository = courierRepository;
        this.notificationRepository = notificationRepository;
        this.restaurantRepository = restaurantRepository;
        this.receiptStorageService = receiptStorageService;
        this.telegramService = telegramService;
        this.courierNotificationService = courierNotificationService;
        this.courierOfferRotationService = courierOfferRotationService;
        this.orderVerificationService = orderVerificationService;
    }

    @GetMapping
    public List<CustomerOrder> getAllOrders(
            @RequestParam(required = false) Long restaurantId
    ) {
        if (restaurantId != null) {
            return repo.findByRestaurantIdOrderByCreatedAtDesc(restaurantId);
        }
        return repo.findAll();
    }

    @GetMapping("/new")
    public List<CustomerOrder> getNewOrders(
            @RequestParam(required = false) Long restaurantId
    ) {
        if (restaurantId != null) {
            return repo.findByRestaurantIdAndOrderStatusOrderByCreatedAtDesc(
                    restaurantId,
                    "NEW"
            );
        }
        return repo.findByOrderStatusOrderByCreatedAtDesc("NEW");
    }

    @GetMapping("/cafe")
    public List<CustomerOrder> getCafeOrders(
            @RequestParam(required = false) Long restaurantId
    ) {
        if (restaurantId != null) {
            return repo.findByRestaurantIdAndOrderStatusInOrderByCreatedAtAsc(
                    restaurantId,
                    CAFE_STATUSES
            );
        }
        return repo.findByOrderStatusInOrderByCreatedAtAsc(CAFE_STATUSES);
    }

    @GetMapping("/courier")
    public ResponseEntity<?> getCourierOrders(@RequestParam(required = false) Long courierId) {
        if (courierId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "courierId талап кылынат"));
        }
        return ResponseEntity.ok(
                repo.findByCourierIdAndOrderStatusInOrderByCreatedAtAsc(
                        courierId,
                        List.of("COOKING", "READY", "GIVEN_TO_COURIER")
                )
        );
    }

    /** Бош заказдар — эч ким албagan */
    @GetMapping("/courier/available")
    public List<CustomerOrder> getAvailableCourierOrders() {
        return repo.findByOrderStatusAndCourierIdIsNullOrderByCourierAtAsc("GIVEN_TO_COURIER");
    }

    /** Жаңы суроолор — ашкана даярдоону баштаган, курьер кабыл алган жок (линияда болсо гана) */
    @GetMapping("/courier/offers")
    public List<CustomerOrder> getCourierOffers(@RequestParam(required = false) Long courierId) {
        if (courierId == null) {
            return List.of();
        }
        return courierRepository.findById(courierId)
                .filter(c -> Boolean.TRUE.equals(c.getOnline()))
                .map(c -> repo.findByOrderStatusAndCourierIdIsNullOrderByCookingStartedAtDesc("COOKING").stream()
                        .filter(o -> courierId.equals(o.getActiveOfferCourierId()))
                        .toList())
                .orElse(List.of());
    }

    /** Курьердин жеткирген тарыхы */
    @GetMapping("/courier/history")
    public ResponseEntity<?> getCourierHistory(@RequestParam(required = false) Long courierId) {
        if (courierId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "courierId талап кылынат"));
        }
        return ResponseEntity.ok(
                repo.findByOrderStatusAndCourierIdOrderByDeliveredAtDesc("DELIVERED", courierId)
        );
    }

    /** Заказды курьер өзүнө алат */
    @PutMapping("/{id}/take")
    public ResponseEntity<CustomerOrder> takeOrder(
            @PathVariable Long id,
            @RequestParam Long courierId
    ) {
        CustomerOrder order = repo.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"GIVEN_TO_COURIER".equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().build();
        }
        if (order.getCourierId() != null && !order.getCourierId().equals(courierId)) {
            return ResponseEntity.status(409).build();
        }
        if (order.getCourierId() == null) {
            order.setCourierId(courierId);
            order = repo.save(order);
        }
        return ResponseEntity.ok(order);
    }

    /** Курьер «Даярдоо» эскертүüsүн кабыл алат */
    @PutMapping("/{id}/courier-accept")
    public ResponseEntity<CustomerOrder> courierAcceptOffer(
            @PathVariable Long id,
            @RequestParam Long courierId
    ) {
        CustomerOrder order = repo.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"COOKING".equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().build();
        }
        if (order.getCourierId() != null && !order.getCourierId().equals(courierId)) {
            return ResponseEntity.status(409).build();
        }
        if (order.getActiveOfferCourierId() != null && !order.getActiveOfferCourierId().equals(courierId)) {
            return ResponseEntity.status(409).build();
        }
        order.setCourierId(courierId);
        courierOfferRotationService.stopRotation(order);
        CustomerOrder saved = repo.save(order);
        courierNotificationService.dismissOffersForOrder(id);
        courierRepository.findById(courierId).ifPresent(c ->
                courierNotificationService.notifyCourierAccepted(saved, c)
        );
        return ResponseEntity.ok(saved);
    }

    /** Курьер баш тартуу */
    @PutMapping("/{id}/courier-decline")
    public ResponseEntity<Void> courierDeclineOffer(
            @PathVariable Long id,
            @RequestParam Long courierId
    ) {
        CustomerOrder order = repo.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        if (!courierId.equals(order.getActiveOfferCourierId())) {
            return ResponseEntity.status(409).build();
        }
        courierNotificationService.declineOffer(id, courierId);
        courierOfferRotationService.rotateToNext(id);
        return ResponseEntity.ok().build();
    }

    /** Курьер ресторандан заказды алды */
    @PutMapping("/{id}/courier-pickup")
    public ResponseEntity<CustomerOrder> courierPickup(
            @PathVariable Long id,
            @RequestParam Long courierId
    ) {
        CustomerOrder order = repo.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"READY".equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().build();
        }
        if (order.getCourierId() == null || !order.getCourierId().equals(courierId)) {
            return ResponseEntity.status(403).build();
        }
        order.setOrderStatus("GIVEN_TO_COURIER");
        order.setCourierAt(LocalDateTime.now(BISHKEK));
        CustomerOrder saved = repo.save(order);
        notificationRepository.findByOrderIdAndCourierIdAndTypeAndReadFlagFalse(
                id, courierId, "READY"
        ).forEach(n -> {
            n.setReadFlag(true);
            notificationRepository.save(n);
        });
        return ResponseEntity.ok(saved);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CustomerOrder> createOrder(
            @RequestBody CustomerOrder order
    ) {
        ensureRestaurantAcceptingOrders(order.getRestaurantId());
        prepareNewOrder(order);
        CustomerOrder savedOrder = repo.save(order);
        notifyNewOrder(savedOrder);
        return ResponseEntity.ok(savedOrder);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomerOrder> createOrderWithReceipt(
            @RequestParam String customerName,
            @RequestParam String phone,
            @RequestParam String address,
            @RequestParam(required = false) String comment,
            @RequestParam(required = false) String foodComment,
            @RequestParam String itemName,
            @RequestParam Integer quantity,
            @RequestParam Double totalPrice,
            @RequestParam Double paymentAmount,
            @RequestParam(required = false) Long restaurantId,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam("receipt") MultipartFile receipt
    ) throws IOException {

        CustomerOrder order = new CustomerOrder();
        order.setCustomerName(customerName);
        order.setPhone(phone);
        order.setAddress(address);
        order.setLatitude(latitude);
        order.setLongitude(longitude);
        order.setComment(comment);
        order.setFoodComment(foodComment);
        order.setItemName(itemName);
        order.setQuantity(quantity);
        order.setTotalPrice(totalPrice);
        order.setPaymentAmount(paymentAmount);

        if (restaurantId == null) {
            return ResponseEntity.badRequest().build();
        }
        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
        if (restaurant == null || Boolean.FALSE.equals(restaurant.getActive())) {
            return ResponseEntity.badRequest().build();
        }
        order.setRestaurantId(restaurantId);

        ensureRestaurantAcceptingOrders(restaurantId);
        prepareNewOrder(order);
        CustomerOrder savedOrder = repo.save(order);

        String receiptPath = receiptStorageService.saveReceipt(receipt);
        savedOrder.setReceiptImagePath(receiptPath);
        savedOrder = repo.save(savedOrder);

        notifyNewOrder(savedOrder);
        return ResponseEntity.ok(savedOrder);
    }

    @GetMapping("/active")
    public List<CustomerOrder> getActiveOrders(
            @RequestParam(required = false) Long restaurantId
    ) {
        if (restaurantId != null) {
            // Restaurant panels: only post-verification orders (RATLION accept required)
            return repo.findByRestaurantIdAndOrderStatusNotInOrderByCreatedAtDesc(
                    restaurantId,
                    List.of("DELIVERED", "CANCELLED", "NEW")
            );
        }
        return repo.findByOrderStatusNotInOrderByCreatedAtDesc(
                List.of("DELIVERED", "CANCELLED")
        );
    }

    @GetMapping("/history")
    public List<CustomerOrder> getOrderHistory(
            @RequestParam(required = false) Long restaurantId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        LocalDateTime start = parseDateStart(from);
        LocalDateTime end = parseDateEnd(to);
        if (status != null && !status.isBlank()) {
            if (restaurantId != null) {
                return repo.findByRestaurantIdAndOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                        restaurantId, status, start, end);
            }
            return repo.findByOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                    status, start, end);
        }
        if (restaurantId != null) {
            return repo.findByRestaurantIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                    restaurantId, start, end);
        }
        return repo.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(start, end);
    }

    @GetMapping("/track/{id}")
    public ResponseEntity<CustomerOrder> trackOrder(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerOrder> getOrderById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<CustomerOrder> acceptOrder(
            @PathVariable Long id,
            @RequestParam(required = false) String operator
    ) {
        CustomerOrder existing = repo.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"NEW".equals(existing.getOrderStatus())) {
            log.warn("Accept rejected for order {} — status is {}", id, existing.getOrderStatus());
            return ResponseEntity.badRequest().build();
        }
        return orderVerificationService.acceptOrder(id, operator)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/cook")
    public ResponseEntity<CustomerOrder> cooking(@PathVariable Long id) {
        return updateStatus(id, "COOKING", false);
    }

    @PutMapping("/{id}/ready")
    public ResponseEntity<CustomerOrder> ready(@PathVariable Long id) {
        return updateStatus(id, "READY", false);
    }

    @PutMapping("/{id}/courier")
    public ResponseEntity<CustomerOrder> courier(@PathVariable Long id) {
        return updateStatus(id, "GIVEN_TO_COURIER", true);
    }

    @PutMapping("/{id}/deliver")
    public ResponseEntity<CustomerOrder> delivered(
            @PathVariable Long id,
            @RequestParam(required = false) Long courierId
    ) {
        CustomerOrder order = repo.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"GIVEN_TO_COURIER".equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().build();
        }
        if (courierId == null) {
            return ResponseEntity.badRequest().build();
        }
        if (order.getCourierId() != null && !order.getCourierId().equals(courierId)) {
            return ResponseEntity.status(403).build();
        }

        order.setOrderStatus("DELIVERED");
        order.setDeliveredAt(LocalDateTime.now(BISHKEK));
        order.setCourierId(courierId);

        if ("WAITING_PAYMENT".equals(order.getPaymentStatus())
                || "WAITING".equals(order.getPaymentStatus())) {
            order.setPaymentStatus("PAID");
        }

        CustomerOrder saved = repo.save(order);
        notifyOrderDelivered(saved);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<CustomerOrder> cancel(
            @PathVariable Long id,
            @RequestParam(required = false) String operator
    ) {
        CustomerOrder existing = repo.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"NEW".equals(existing.getOrderStatus())) {
            return ResponseEntity.badRequest().build();
        }
        return orderVerificationService.rejectOrder(id, operator)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private LocalDateTime parseDateStart(String from) {
        if (from == null || from.isBlank()) {
            return LocalDateTime.now(BISHKEK).toLocalDate().atStartOfDay();
        }
        return LocalDateTime.parse(from + "T00:00:00");
    }

    private LocalDateTime parseDateEnd(String to) {
        if (to == null || to.isBlank()) {
            return LocalDateTime.now(BISHKEK).toLocalDate().plusDays(1).atStartOfDay();
        }
        return LocalDateTime.parse(to + "T23:59:59");
    }

    private void prepareNewOrder(CustomerOrder order) {
        order.setOrderStatus("NEW");
        order.setPaymentStatus("WAITING_PAYMENT");
        order.setCourierId(null);
        assignDisplayOrderNumber(order);
    }

    private void ensureRestaurantAcceptingOrders(Long restaurantId) {
        if (restaurantId == null) {
            return;
        }
        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
        if (restaurant != null && Boolean.FALSE.equals(restaurant.getAcceptingOrders())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "RESTAURANT_CLOSED");
        }
    }

    /** AI1, FM1, OD1 — ар бир ресторандын өз номери */
    private void assignDisplayOrderNumber(CustomerOrder order) {
        Long restaurantId = order.getRestaurantId();
        long count = restaurantId != null
                ? repo.countByRestaurantIdAndDisplayOrderNumberIsNotNull(restaurantId)
                : repo.countByDisplayOrderNumberIsNotNull();

        String prefix = "OD";
        if (restaurantId != null) {
            Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
            if (restaurant != null && restaurant.getOrderPrefix() != null && !restaurant.getOrderPrefix().isBlank()) {
                prefix = restaurant.getOrderPrefix().trim();
            }
        }

        order.setDisplayOrderNumber(prefix + (count + 1));
    }

    private String restaurantLabel(CustomerOrder order) {
        if (order.getRestaurantId() == null) {
            return "Ресторан";
        }
        return restaurantRepository.findById(order.getRestaurantId())
                .map(Restaurant::getName)
                .orElse("Ресторан");
    }

    /** Кардар заказ бергенде — Ratlion Telegram группасына (чек + баскычтар) */
    private void notifyNewOrder(CustomerOrder order) {
        orderVerificationService.sendDispatcherVerification(order);
    }

    private void notifyCouriersPickup(CustomerOrder order) {
        courierNotificationService.notifyPickup(order);
    }

    private void notifyOrderDelivered(CustomerOrder order) {
        telegramService.sendToManager(
                "✅ ЗАКАЗ ЖЕТКИРИЛДИ\n\n"
                        + "🏷 " + safe(order.getDisplayOrderNumber()) + "\n"
                        + "👤 " + safe(order.getCustomerName()) + "\n"
                        + "💰 " + formatAmount(order.getTotalPrice()) + " сом"
        );
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "—" : value.trim();
    }

    private String formatAmount(Double amount) {
        if (amount == null) {
            return "0";
        }
        if (amount % 1 == 0) {
            return String.valueOf(amount.intValue());
        }
        return String.valueOf(amount);
    }

    private ResponseEntity<CustomerOrder> updateStatus(
            Long id,
            String status,
            boolean notifyCouriers
    ) {
        CustomerOrder order = repo.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        order.setOrderStatus(status);
        LocalDateTime now = LocalDateTime.now(BISHKEK);
        if ("COOKING".equals(status)) {
            order.setCookingStartedAt(now);
        } else if ("READY".equals(status)) {
            order.setReadyAt(now);
        } else if ("GIVEN_TO_COURIER".equals(status)) {
            order.setCourierAt(now);
        } else if ("DELIVERED".equals(status)) {
            order.setDeliveredAt(now);
        }
        CustomerOrder saved = repo.save(order);

        if ("COOKING".equals(status)) {
            courierOfferRotationService.startRotation(saved);
        } else if ("READY".equals(status)) {
            courierNotificationService.notifyOrderReady(saved);
        } else if (notifyCouriers && "GIVEN_TO_COURIER".equals(status)) {
            notifyCouriersPickup(saved);
        }

        return ResponseEntity.ok(saved);
    }
}
