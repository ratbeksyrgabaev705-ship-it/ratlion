package kg.restaurant.order.controller;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.service.CourierTelegramService;
import kg.restaurant.order.service.OrderVerificationService;
import kg.restaurant.order.service.TelegramService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
public class TelegramWebhookController {

    private final CourierRepository courierRepository;
    private final TelegramService telegramService;
    private final OrderVerificationService orderVerificationService;
    private final CourierTelegramService courierTelegramService;

    @Value("${app.public-url:http://localhost:8080}")
    private String publicUrl;

    public TelegramWebhookController(
            CourierRepository courierRepository,
            TelegramService telegramService,
            OrderVerificationService orderVerificationService,
            CourierTelegramService courierTelegramService
    ) {
        this.courierRepository = courierRepository;
        this.telegramService = telegramService;
        this.orderVerificationService = orderVerificationService;
        this.courierTelegramService = courierTelegramService;
    }

    @PostMapping("/webhook")
    public void handleWebhook(@RequestBody Map<String, Object> update) {
        if (!telegramService.isConfigured()) {
            return;
        }

        Map<String, Object> callback = asMap(update.get("callback_query"));
        if (callback != null) {
            String data = asString(callback.get("data")).trim();
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

        if (text.startsWith("/register")) {
            handleRegister(chatId, text, firstName);
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
        String orderUrl = normalizePublicUrl(publicUrl) + "/";
        String greeting = "Салам" + (firstName.isBlank() ? "!" : ", " + firstName + "!")
                + "\n\n"
                + "🔥 RATLION — Базар-Коргон тамак жеткирүү.\n\n"
                + "🌐 Заказ берүү: " + orderUrl + "\n\n"
                + "🛵 Курьер болуу: /register Атыңыз";
        telegramService.sendToCourier(chatId, greeting);
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

    private void handleRegister(String chatId, String text, String firstName) {
        String name = text.replace("/register", "").trim();
        if (name.isBlank()) {
            name = firstName.isBlank() ? "Курьер" : firstName;
        }

        if (courierRepository.existsByTelegramChatId(chatId)) {
            Courier existing = courierRepository.findByTelegramChatId(chatId).orElse(null);
            if (existing != null && Boolean.TRUE.equals(existing.getActive())) {
                telegramService.sendToCourier(
                        chatId,
                        "✅ Сиз мурунтан эле катталгансыз: " + existing.getName()
                );
            } else {
                telegramService.sendToCourier(
                        chatId,
                        "⏳ Сиздин каттооңуз күтүлүүдө.\n"
                                + "Менеджер /owner панелинен активдештирет."
                );
            }
            return;
        }

        Courier courier = new Courier();
        courier.setName(name);
        courier.setTelegramChatId(chatId);
        courier.setActive(false);
        courierRepository.save(courier);

        telegramService.sendToManager(
                "🛵 ЖАҢЫ КУРЬЕР КАТТОО СУРАМЫ\n\n"
                        + "👤 " + name + "\n"
                        + "Telegram ID: " + chatId + "\n\n"
                        + "→ /owner панелинен активдештирүү"
        );

        telegramService.sendToCourier(
                chatId,
                "✅ Каттоо суроо жөнөтүлдү!\n\n"
                        + "Атыңыз: " + name + "\n"
                        + "Telegram ID: " + chatId + "\n\n"
                        + "Менеджер активдештиргенден кийин жеткирүү заказдары келет."
        );
    }
}
