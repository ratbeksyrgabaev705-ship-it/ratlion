package kg.restaurant.order.service;

import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.model.Courier;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.CustomerOrderRepository;
import kg.restaurant.order.repository.RestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * RATLION диспетчер группасында заказ текшерүү — Telegram баскычтары.
 */
@Service
public class OrderVerificationService {

    private static final Logger log = LoggerFactory.getLogger(OrderVerificationService.class);
    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");
    private static final DateTimeFormatter ORDER_TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter ORDER_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final CustomerOrderRepository orderRepository;
    private final RestaurantRepository restaurantRepository;
    private final CourierRepository courierRepository;
    private final TelegramService telegramService;
    private final ReceiptStorageService receiptStorageService;

    public OrderVerificationService(
            CustomerOrderRepository orderRepository,
            RestaurantRepository restaurantRepository,
            CourierRepository courierRepository,
            TelegramService telegramService,
            ReceiptStorageService receiptStorageService
    ) {
        this.orderRepository = orderRepository;
        this.restaurantRepository = restaurantRepository;
        this.courierRepository = courierRepository;
        this.telegramService = telegramService;
        this.receiptStorageService = receiptStorageService;
    }

    /** Жаңы заказ — Ratlion Telegram группасына чек + баскычтар */
    public void sendDispatcherVerification(CustomerOrder order) {
        if (!telegramService.isConfigured()) {
            return;
        }
        String chatId = telegramService.getDispatcherChatId();
        if (chatId == null || chatId.isBlank()) {
            log.warn("Telegram dispatcher chat ID жок — TELEGRAM_CHAT_ID коюңуз");
            return;
        }

        String caption = buildVerificationCaption(order, null);

        List<List<Map<String, String>>> keyboard = List.of(List.of(
                Map.of("text", "✅ Кабыл алуу", "callback_data", "order_accept:" + order.getId()),
                Map.of("text", "❌ Четке кагуу", "callback_data", "order_reject:" + order.getId())
        ));

        TelegramService.TelegramMessageResult result = receiptStorageService
                .resolveReceiptFile(order.getReceiptImagePath())
                .map(path -> telegramService.sendPhotoFileWithInlineKeyboard(chatId, path, caption, keyboard))
                .orElseGet(() -> telegramService.sendMessageWithInlineKeyboard(chatId, caption, keyboard));

        if (!result.success()) {
            log.error("Dispatcher группасына чек менен жиберилбedi: {} — текст + баскычтар", result.error());
            result = telegramService.sendMessageWithInlineKeyboard(
                    chatId,
                    caption + "\n\n📸 Чек сүрөтсүз (файл табылган жок)",
                    keyboard
            );
        }

        if (!result.success()) {
            log.error("Dispatcher группасына заказ жиберилбedi: {}", result.error());
        }
    }

    public Optional<CustomerOrder> acceptOrder(Long orderId, String operator) {
        CustomerOrder order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return Optional.empty();
        }
        if (!"NEW".equals(order.getOrderStatus())) {
            return Optional.of(order);
        }

        if (order.getDisplayOrderNumber() == null || order.getDisplayOrderNumber().isBlank()) {
            assignDisplayOrderNumber(order);
        }

        order.setOrderStatus("ACCEPTED");
        order.setPaymentStatus("PAID");
        order.setAcceptedAt(LocalDateTime.now(BISHKEK));
        if (operator != null && !operator.isBlank()) {
            order.setOperatorName(operator.trim());
        }

        CustomerOrder saved = orderRepository.save(order);
        try {
            notifyOrderAccepted(saved);
        } catch (Exception e) {
            log.error("Accept ok for order {}, notify failed: {}", orderId, e.getMessage(), e);
        }
        return Optional.of(saved);
    }

    public Optional<CustomerOrder> rejectOrder(Long orderId, String operator) {
        CustomerOrder order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return Optional.empty();
        }
        if (!"NEW".equals(order.getOrderStatus())) {
            return Optional.of(order);
        }

        order.setOrderStatus("CANCELLED");
        order.setPaymentStatus("REJECTED");
        if (operator != null && !operator.isBlank()) {
            order.setOperatorName(operator.trim());
        }
        return Optional.of(orderRepository.save(order));
    }

    @SuppressWarnings("unchecked")
    public void handleTelegramCallback(Map<String, Object> callback) {
        String callbackId = asString(callback.get("id"));
        String data = asString(callback.get("data")).trim();
        Map<String, Object> message = asMap(callback.get("message"));
        Map<String, Object> chat = message == null ? null : asMap(message.get("chat"));
        String chatId = chat == null ? "" : asString(chat.get("id"));
        Integer messageId = message == null ? null : asInteger(message.get("message_id"));

        Map<String, Object> from = asMap(callback.get("from"));
        String operator = buildOperatorName(from);

        if (!telegramService.isDispatcherChat(chatId)) {
            telegramService.answerCallbackQuery(callbackId, "Бул группadan гана иштейт", true);
            return;
        }

        if (data.startsWith("order_accept:")) {
            handleAcceptCallback(callbackId, data, operator, chatId, messageId);
            return;
        }
        if (data.startsWith("order_reject:")) {
            handleRejectCallback(callbackId, data, operator, chatId, messageId);
        }
    }

    private void handleAcceptCallback(
            String callbackId,
            String data,
            String operator,
            String chatId,
            Integer messageId
    ) {
        Long orderId = parseOrderId(data, "order_accept:");
        if (orderId == null) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }

        CustomerOrder before = orderRepository.findById(orderId).orElse(null);
        if (before == null) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }
        if (!"NEW".equals(before.getOrderStatus())) {
            telegramService.answerCallbackQuery(callbackId, "Бул заказ мурунтан иштелген", true);
            updateVerificationMessage(chatId, messageId, before, before.getOrderStatus(), operator);
            return;
        }

        Optional<CustomerOrder> accepted = acceptOrder(orderId, operator);
        if (accepted.isEmpty()) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }

        CustomerOrder order = accepted.get();
        telegramService.answerCallbackQuery(callbackId, "✅ Кабыл алынды!", false);
        updateVerificationMessage(chatId, messageId, order, "ACCEPTED", operator);
        telegramService.sendToManager(
                "✅ " + operator + " кабыл алды: "
                        + orderLabel(order) + " — " + safe(order.getCustomerName())
        );
    }

    private void handleRejectCallback(
            String callbackId,
            String data,
            String operator,
            String chatId,
            Integer messageId
    ) {
        Long orderId = parseOrderId(data, "order_reject:");
        if (orderId == null) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }

        CustomerOrder before = orderRepository.findById(orderId).orElse(null);
        if (before == null) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }
        if (!"NEW".equals(before.getOrderStatus())) {
            telegramService.answerCallbackQuery(callbackId, "Бул заказ мурунтан иштелген", true);
            updateVerificationMessage(chatId, messageId, before, before.getOrderStatus(), operator);
            return;
        }

        Optional<CustomerOrder> rejected = rejectOrder(orderId, operator);
        if (rejected.isEmpty()) {
            telegramService.answerCallbackQuery(callbackId, "Заказ табылган жок", true);
            return;
        }

        CustomerOrder order = rejected.get();
        telegramService.answerCallbackQuery(callbackId, "❌ Четке кагылды", false);
        updateVerificationMessage(chatId, messageId, order, "CANCELLED", operator);
        telegramService.sendToManager(
                "❌ " + operator + " четке кагды: "
                        + orderLabel(order) + " — " + safe(order.getCustomerName())
                        + "\n📞 Кардарга телефон аркылуу билдириңиз: " + safe(order.getPhone())
        );
    }

    private void updateVerificationMessage(
            String chatId,
            Integer messageId,
            CustomerOrder order,
            String status,
            String operator
    ) {
        if (chatId == null || chatId.isBlank() || messageId == null) {
            return;
        }
        String caption = buildVerificationCaption(order, status);
        if (operator != null && !operator.isBlank()) {
            caption += "\n\n👤 " + operator;
        }
        telegramService.editMessageCaption(chatId, messageId, caption);
        telegramService.editMessageReplyMarkup(chatId, messageId, null);
    }

    private String buildVerificationCaption(CustomerOrder order, String decisionStatus) {
        Restaurant restaurant = order.getRestaurantId() == null
                ? null
                : restaurantRepository.findById(order.getRestaurantId()).orElse(null);

        String restName = restaurant != null ? safe(restaurant.getName()) : restaurantLabel(order);
        String prefix = restaurant != null ? safe(restaurant.getOrderPrefix()) : "";
        String restLine = prefix.isBlank() ? restName : restName + " (" + prefix + ")";

        Double amount = order.getPaymentAmount() != null ? order.getPaymentAmount() : order.getTotalPrice();

        StringBuilder sb = new StringBuilder();
        sb.append("🔔 ЖАҢЫ ЗАКАЗ ").append(orderLabel(order)).append("\n\n");
        sb.append("🍽 Ресторан: ").append(restLine).append("\n");
        sb.append("👤 Кардар: ").append(safe(order.getCustomerName())).append("\n");
        sb.append("📞 Телефон: ").append(safe(order.getPhone())).append("\n");
        sb.append("📍 Дарек: ").append(safe(order.getAddress())).append("\n\n");
        sb.append("📝 ЗАКАЗ СОСТАВЫ:\n");
        sb.append(formatItems(order.getItemName())).append("\n");
        if (order.getFoodComment() != null && !order.getFoodComment().isBlank()) {
            sb.append("\n💬 ").append(safe(order.getFoodComment())).append("\n");
        }
        sb.append("\n💰 Жалпы сумма: ").append(formatAmount(amount)).append(" сом");

        if ("ACCEPTED".equals(decisionStatus)) {
            sb.append("\n\n✅ КАБЫЛ АЛЫНДЫ — ресторанга жиберилди");
        } else if ("CANCELLED".equals(decisionStatus)) {
            sb.append("\n\n❌ ЧЕТКЕ КАГЫЛДЫ");
            sb.append("\n📞 Кардарга телефон аркылуу билдириңиз");
        }

        return sb.toString();
    }

    private String formatItems(String itemName) {
        if (itemName == null || itemName.isBlank()) {
            return "• —";
        }
        String[] parts = itemName.split("\\s*,\\s*");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].isBlank()) {
                continue;
            }
            sb.append("• ").append(parts[i].trim());
            if (i < parts.length - 1) {
                sb.append("\n");
            }
        }
        return sb.toString();
    }

    private String orderLabel(CustomerOrder order) {
        if (order.getDisplayOrderNumber() != null && !order.getDisplayOrderNumber().isBlank()) {
            return "#" + order.getDisplayOrderNumber();
        }
        return "#" + order.getId();
    }

    private String restaurantLabel(CustomerOrder order) {
        if (order.getRestaurantId() == null) {
            return "Ресторан";
        }
        return restaurantRepository.findById(order.getRestaurantId())
                .map(Restaurant::getName)
                .orElse("Ресторан");
    }

    private void assignDisplayOrderNumber(CustomerOrder order) {
        Long restaurantId = order.getRestaurantId();
        long count = restaurantId != null
                ? orderRepository.countByRestaurantIdAndDisplayOrderNumberIsNotNull(restaurantId)
                : orderRepository.countByDisplayOrderNumberIsNotNull();

        String prefix = "OD";
        if (restaurantId != null) {
            Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
            if (restaurant != null && restaurant.getOrderPrefix() != null && !restaurant.getOrderPrefix().isBlank()) {
                prefix = restaurant.getOrderPrefix().trim();
            }
        }
        order.setDisplayOrderNumber(prefix + (count + 1));
    }

    private void notifyOrderAccepted(CustomerOrder order) {
        if (order.getRestaurantId() != null) {
            restaurantRepository.findById(order.getRestaurantId())
                    .ifPresent(restaurant -> {
                        String chatId = restaurant.getTelegramChatId();
                        if (chatId == null || chatId.isBlank()) {
                            log.warn("Ресторан Telegram ID жок: {}", restaurant.getName());
                            return;
                        }
                        String message = buildRestaurantGroupMessage(order, restaurant);
                        TelegramService.TelegramSendResult result = telegramService.sendHtmlToChat(chatId, message);
                        if (!result.success()) {
                            log.warn("Ресторан группасына жиберилбedi ({}): {}", restaurant.getName(), result.error());
                            telegramService.sendToChat(chatId, stripHtml(message));
                        }
                    });
        }
        notifyCouriersWaiting(order);
    }

    /** Ресторан Telegram группасы — ашпозчу/админ көрөт */
    private String buildRestaurantGroupMessage(CustomerOrder order, Restaurant restaurant) {
        Double amount = order.getPaymentAmount() != null ? order.getPaymentAmount() : order.getTotalPrice();
        LocalDateTime when = order.getAcceptedAt() != null ? order.getAcceptedAt() : order.getCreatedAt();
        if (when == null) {
            when = LocalDateTime.now(BISHKEK);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🟢 <b>ЖАҢЫ ЗАКАЗ</b>\n");
        sb.append("<b>№ ").append(htmlEscape(formatDisplayNumber(order, restaurant))).append("</b>\n");
        sb.append("⏰ ").append(when.format(ORDER_TIME)).append(" | ").append(when.format(ORDER_DATE)).append("\n\n");
        sb.append("<b>👤 Кардар:</b> ").append(htmlEscape(order.getCustomerName())).append("\n");
        sb.append("<b>📞 Телефон:</b> ").append(htmlEscape(order.getPhone())).append("\n");
        sb.append("<b>📍 Дарек:</b> ").append(htmlEscape(order.getAddress())).append("\n\n");
        sb.append("<b>📝 ЗАКАЗ СОСТАВЫ:</b>\n");
        sb.append(formatItems(order.getItemName())).append("\n");
        if (order.getFoodComment() != null && !order.getFoodComment().isBlank()) {
            sb.append("\n<b>💬 Тамакка:</b> ").append(htmlEscape(order.getFoodComment())).append("\n");
        }
        if (order.getComment() != null && !order.getComment().isBlank()) {
            sb.append("<b>💬 Жеткирүү:</b> ").append(htmlEscape(order.getComment())).append("\n");
        }
        sb.append("\n<b>💰 Жалпы сумма:</b> ").append(formatAmount(amount)).append(" сом");
        return sb.toString();
    }

    private String formatDisplayNumber(CustomerOrder order, Restaurant restaurant) {
        String num = order.getDisplayOrderNumber();
        if (num == null || num.isBlank()) {
            return String.valueOf(order.getId());
        }
        String prefix = restaurant != null && restaurant.getOrderPrefix() != null
                ? restaurant.getOrderPrefix().trim()
                : "";
        if (!prefix.isBlank() && num.startsWith(prefix)) {
            String suffix = num.substring(prefix.length());
            try {
                int n = Integer.parseInt(suffix);
                return prefix + "-" + String.format("%04d", n);
            } catch (NumberFormatException ignored) {
                return prefix + "-" + suffix;
            }
        }
        return num;
    }

    private String htmlEscape(String value) {
        if (value == null || value.isBlank()) {
            return "—";
        }
        return value.trim()
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private String stripHtml(String html) {
        return html.replaceAll("<[^>]+>", "");
    }

    private void notifyCouriersWaiting(CustomerOrder order) {
        String rest = restaurantLabel(order);
        String num = order.getDisplayOrderNumber() != null
                ? order.getDisplayOrderNumber()
                : "#" + order.getId();
        String text = "📦 " + rest + " — заказ кабыл алынды\n\n"
                + "🏷 " + num + "\n"
                + "👤 " + safe(order.getCustomerName()) + "\n"
                + "📞 " + safe(order.getPhone()) + "\n"
                + "📍 " + safe(order.getAddress()) + "\n\n"
                + "⏳ Ресторан «Даярдоону баштоо» басса — сунуш келет\n"
                + "→ /courier онлайн бол";
        courierRepository.findByActiveTrueOrderByNameAsc().stream()
                .filter(this::courierHasTelegram)
                .forEach(c -> telegramService.sendToCourier(c.getTelegramChatId(), text));
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "—" : value.trim();
    }

    private boolean courierHasTelegram(Courier courier) {
        String id = courier.getTelegramChatId();
        return id != null && !id.isBlank() && !id.startsWith("phone:");
    }

    private Long parseOrderId(String data, String prefix) {
        try {
            return Long.parseLong(data.substring(prefix.length()).trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String buildOperatorName(Map<String, Object> from) {
        if (from == null) {
            return "Диспетчер";
        }
        String first = asString(from.get("first_name"));
        String last = asString(from.get("last_name"));
        String username = asString(from.get("username"));
        String name = (first + " " + last).trim();
        if (!name.isBlank()) {
            return name;
        }
        if (!username.isBlank()) {
            return "@" + username;
        }
        return "Диспетчер";
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
