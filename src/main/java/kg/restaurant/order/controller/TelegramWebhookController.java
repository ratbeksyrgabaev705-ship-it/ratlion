package kg.restaurant.order.controller;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.service.CourierBotRegistrationService;
import kg.restaurant.order.service.CourierTelegramService;
import kg.restaurant.order.service.OrderVerificationService;
import kg.restaurant.order.service.TelegramService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/telegram")
public class TelegramWebhookController {

    private final CourierRepository courierRepository;
    private final TelegramService telegramService;
    private final OrderVerificationService orderVerificationService;
    private final CourierTelegramService courierTelegramService;

    private final CourierBotRegistrationService courierBotRegistrationService;

    @Value("${app.public-url:http://localhost:8080}")
    private String publicUrl;

    public TelegramWebhookController(
            CourierRepository courierRepository,
            TelegramService telegramService,
            OrderVerificationService orderVerificationService,
            CourierTelegramService courierTelegramService,
            CourierBotRegistrationService courierBotRegistrationService
    ) {
        this.courierRepository = courierRepository;
        this.telegramService = telegramService;
        this.orderVerificationService = orderVerificationService;
        this.courierTelegramService = courierTelegramService;
        this.courierBotRegistrationService = courierBotRegistrationService;
    }

    @PostMapping("/webhook")
    public void handleWebhook(@RequestBody Map<String, Object> update) {
        if (!telegramService.isConfigured()) {
            return;
        }

        Map<String, Object> callback = asMap(update.get("callback_query"));
        if (callback != null) {
            String data = asString(callback.get("data")).trim();
            if (data.equals("courier_signup")) {
                handleCourierSignupCallback(callback);
                return;
            }
            if (data.startsWith("courier_deliver:")) {
                courierTelegramService.handleDeliverCallback(callback);
                return;
            }
            if (data.startsWith("rest_ready_courier:")) {
                orderVerificationService.handleRestaurantReadyCallback(callback);
                return;
            }
            orderVerificationService.handleTelegramCallback(callback);
            return;
        }

        Map<String, Object> message = asMap(update.get("message"));
        if (message == null) {
            return;
        }

        Map<String, Object> chat = asMap(message.get("chat"));
        String chatId = chat == null ? "" : asString(chat.get("id"));
        String chatType = chat == null ? "" : asString(chat.get("type"));
        String text = asString(message.get("text")).trim();

        if (chatId.isBlank()) {
            return;
        }

        if ("/id".equals(text) || "/groupid".equals(text)) {
            if ("group".equals(chatType) || "supergroup".equals(chatType)) {
                telegramService.sendToChat(
                        chatId,
                        "📋 Ratlion группанын ID:\n\n"
                                + chatId
                                + "\n\nRender → TELEGRAM_CHAT_ID (же TELEGRAM_MANAGER_CHAT_ID)"
                );
            }
            return;
        }

        if (text.isBlank()) {
            return;
        }

        Map<String, Object> from = asMap(message.get("from"));
        String firstName = from == null ? "" : asString(from.get("first_name"));

        if (text.equals("/start")) {
            if ("group".equals(chatType) || "supergroup".equals(chatType)) {
                telegramService.sendToChat(
                        chatId,
                        "🔥 RATLION диспетчер группасы\n\n"
                                + "Жаңы заказдар бул жерге чек менен келет.\n"
                                + "✅ Кабыл алуу / ❌ Четке кагуу баскычтарын басыңыз.\n\n"
                                + "Группа ID: " + chatId
                );
                return;
            }
            handleStart(chatId, firstName);
            return;
        }

        if (text.startsWith("/register") || text.startsWith("/courier")) {
            handleCourierSignup(chatId, text, firstName);
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

    private void handleStart(String chatId, String firstName) {
        Optional<Courier> existingCourier = courierRepository.findByTelegramChatId(chatId);
        if (existingCourier.isPresent()) {
            Courier courier = courierBotRegistrationService.ensureActive(existingCourier.get());
            courierBotRegistrationService.sendWelcome(chatId, courier, false);
            return;
        }

        String orderUrl = normalizePublicUrl(publicUrl) + "/";
        List<List<Map<String, String>>> keyboard = List.of(
                List.of(Map.of("text", "🍽 Заказ берүү", "url", orderUrl)),
                List.of(Map.of("text", "🛵 Курьер болуу", "callback_data", "courier_signup"))
        );

        telegramService.sendMessageWithInlineKeyboard(
                chatId,
                "Салам" + (firstName.isBlank() ? "!" : ", " + firstName + "!")
                        + "\n\n"
                        + "🔥 RATLION — Базар-Коргон тамак жеткирүү.\n\n"
                        + "🍽 Заказ — төмөнкү баскыч\n"
                        + "🛵 Курьер — /courier Атыңыз",
                keyboard
        );
    }

    private String normalizePublicUrl(String url) {
        if (url == null || url.isBlank()) {
            return "https://ratlion.onrender.com";
        }
        String trimmed = url.trim();
        if (trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private void handleCourierSignupCallback(Map<String, Object> callback) {
        String callbackId = asString(callback.get("id"));
        Map<String, Object> from = asMap(callback.get("from"));
        String chatId = from == null ? "" : asString(from.get("id"));
        String firstName = from == null ? "" : asString(from.get("first_name"));
        if (chatId.isBlank()) {
            telegramService.answerCallbackQuery(callbackId, "Кайра /courier Атыңыз", true);
            return;
        }
        handleCourierSignup(chatId, "/courier " + firstName, firstName);
        telegramService.answerCallbackQuery(callbackId, "✅ Курьер катталдыңыз!", false);
    }

    private void handleCourierSignup(String chatId, String text, String firstName) {
        String name = text.replace("/register", "").replace("/courier", "").trim();
        if (name.isBlank()) {
            name = firstName.isBlank() ? "Курьер" : firstName;
        }

        boolean isNew = !courierRepository.existsByTelegramChatId(chatId);
        Courier courier = courierBotRegistrationService.registerOrActivate(chatId, name);
        courierBotRegistrationService.sendWelcome(chatId, courier, isNew);

        if (isNew) {
            telegramService.sendToManager(
                    "🛵 ЖАҢЫ КУРЬЕР (авто-актив)\n\n"
                            + "👤 " + courier.getName() + "\n"
                            + "Telegram ID: " + chatId
            );
        }
    }
}
