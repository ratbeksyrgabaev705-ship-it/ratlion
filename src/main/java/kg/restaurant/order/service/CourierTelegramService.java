package kg.restaurant.order.service;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.repository.CourierNotificationRepository;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.CustomerOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@Service
public class CourierTelegramService {

    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");

    private final CourierRepository courierRepository;
    private final CustomerOrderRepository orderRepository;
    private final CourierNotificationRepository notificationRepository;
    private final TelegramService telegramService;

    public CourierTelegramService(
            CourierRepository courierRepository,
            CustomerOrderRepository orderRepository,
            CourierNotificationRepository notificationRepository,
            TelegramService telegramService
    ) {
        this.courierRepository = courierRepository;
        this.orderRepository = orderRepository;
        this.notificationRepository = notificationRepository;
        this.telegramService = telegramService;
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public void handleDeliverCallback(Map<String, Object> callback) {
        String callbackId = asString(callback.get("id"));
        String data = asString(callback.get("data")).trim();
        if (!data.startsWith("courier_deliver:")) {
            return;
        }

        Long orderId = parseOrderId(data, "courier_deliver:");
        Map<String, Object> from = asMap(callback.get("from"));
        String courierChatId = from == null ? "" : asString(from.get("id"));
        Map<String, Object> message = asMap(callback.get("message"));
        Integer messageId = message == null ? null : asInteger(message.get("message_id"));
        String messageChatId = message == null ? courierChatId : asString(asMap(message.get("chat")) == null
                ? null : asMap(message.get("chat")).get("id"));
        if (messageChatId.isBlank()) {
            messageChatId = courierChatId;
        }

        if (orderId == null || courierChatId.isBlank()) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }

        Courier courier = courierRepository.findByTelegramChatId(courierChatId).orElse(null);
        if (courier == null || !Boolean.TRUE.equals(courier.getActive())) {
            telegramService.answerCallbackQuery(callbackId, "Курьер катталган эмес", true);
            return;
        }

        CustomerOrder order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }

        if (order.getCourierId() != null && !order.getCourierId().equals(courier.getId())) {
            telegramService.answerCallbackQuery(callbackId, "Бул заказ башка курьerde", true);
            return;
        }

        String status = order.getOrderStatus();
        if ("DELIVERED".equals(status)) {
            telegramService.answerCallbackQuery(callbackId, "✅ Мурунтан жеткирилген", false);
            updateTelegramMessage(messageChatId, messageId, order, courier);
            return;
        }
        if (!"READY".equals(status) && !"GIVEN_TO_COURIER".equals(status)) {
            telegramService.answerCallbackQuery(callbackId, "Бул заказ азыр жеткирүүгө даяр эмес", true);
            return;
        }

        order.setOrderStatus("DELIVERED");
        order.setDeliveredAt(LocalDateTime.now(BISHKEK));
        order.setCourierId(courier.getId());
        if (order.getCourierAt() == null) {
            order.setCourierAt(LocalDateTime.now(BISHKEK));
        }
        if ("WAITING_PAYMENT".equals(order.getPaymentStatus()) || "WAITING".equals(order.getPaymentStatus())) {
            order.setPaymentStatus("PAID");
        }
        orderRepository.save(order);

        markNotificationsRead(order.getId(), courier.getId());

        telegramService.answerCallbackQuery(callbackId, "✅ Жеткирилди!", false);
        updateTelegramMessage(messageChatId, messageId, order, courier);

        telegramService.sendToManager(
                "✅ КУРЬЕР ЖЕТКИРДИ (Telegram)\n\n"
                        + "🏷 " + orderNumber(order) + "\n"
                        + "👤 " + safe(order.getCustomerName()) + "\n"
                        + "🛵 " + courier.getName() + "\n"
                        + "💰 " + formatAmount(order.getTotalPrice()) + " сом"
        );
    }

    private void markNotificationsRead(Long orderId, Long courierId) {
        notificationRepository.findByOrderIdAndCourierIdAndTypeAndReadFlagFalse(orderId, courierId, "READY")
                .forEach(n -> {
                    n.setReadFlag(true);
                    notificationRepository.save(n);
                });
        notificationRepository.findByOrderIdAndCourierIdAndTypeAndReadFlagFalse(orderId, courierId, "PICKUP")
                .forEach(n -> {
                    n.setReadFlag(true);
                    notificationRepository.save(n);
                });
    }

    private void updateTelegramMessage(
            String chatId,
            Integer messageId,
            CustomerOrder order,
            Courier courier
    ) {
        if (chatId == null || chatId.isBlank() || messageId == null) {
            return;
        }
        String text = "✅ ЖЕТКИРИЛДИ\n\n"
                + "🏷 № " + orderNumber(order) + "\n"
                + "👤 " + safe(order.getCustomerName()) + "\n"
                + "📞 " + safe(order.getPhone()) + "\n"
                + "📍 " + safe(order.getAddress()) + "\n\n"
                + "🛵 " + courier.getName();
        telegramService.editMessageText(chatId, messageId, text);
        telegramService.editMessageReplyMarkup(chatId, messageId, Map.of("inline_keyboard", List.of()));
    }

    public static String buildReadyMessage(CustomerOrder order, String restaurantName) {
        return "✅ " + restaurantName + " — ЗАКАЗ ДАЯР!\n\n"
                + "🏷 № " + orderNumberStatic(order) + "\n"
                + "👤 " + safeStatic(order.getCustomerName()) + "\n"
                + "📞 " + safeStatic(order.getPhone()) + "\n"
                + "📍 " + safeStatic(order.getAddress()) + "\n"
                + "🍽 " + safeStatic(order.getItemName()) + "\n\n"
                + "Кардарга жеткиргенден кийин баскычты басыңыз:";
    }

    private String orderNumber(CustomerOrder order) {
        return orderNumberStatic(order);
    }

    private static String orderNumberStatic(CustomerOrder order) {
        if (order.getDisplayOrderNumber() != null && !order.getDisplayOrderNumber().isBlank()) {
            return order.getDisplayOrderNumber();
        }
        return "#" + order.getId();
    }

    private String safe(String value) {
        return safeStatic(value);
    }

    private static String safeStatic(String value) {
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

    private Long parseOrderId(String data, String prefix) {
        try {
            return Long.parseLong(data.substring(prefix.length()).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private String asString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return value == null ? null : Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
