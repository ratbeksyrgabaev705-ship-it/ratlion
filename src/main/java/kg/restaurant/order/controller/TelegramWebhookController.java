package kg.restaurant.order.controller;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.service.TelegramService;
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

    public TelegramWebhookController(
            CourierRepository courierRepository,
            TelegramService telegramService
    ) {
        this.courierRepository = courierRepository;
        this.telegramService = telegramService;
    }

    @PostMapping("/webhook")
    public void handleWebhook(@RequestBody Map<String, Object> update) {
        if (!telegramService.isConfigured()) {
            return;
        }

        Map<String, Object> message = asMap(update.get("message"));
        if (message == null) {
            return;
        }

        Map<String, Object> chat = asMap(message.get("chat"));
        String chatId = chat == null ? "" : asString(chat.get("id"));
        String text = asString(message.get("text")).trim();

        if (chatId.isBlank() || text.isBlank()) {
            return;
        }

        Map<String, Object> from = asMap(message.get("from"));
        String firstName = from == null ? "" : asString(from.get("first_name"));

        if (text.equals("/start") || text.equals("/id")) {
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
        telegramService.sendToCourier(
                chatId,
                "Салам" + (firstName.isBlank() ? "!" : ", " + firstName + "!")
                        + "\n\n"
                        + "RATLION курьер боту.\n\n"
                        + "Сиздин Telegram ID:\n"
                        + chatId + "\n\n"
                        + "Курьер каттоо:\n"
                        + "/register Атыңыз\n"
                        + "Мисалы: /register Азамат\n\n"
                        + "Менеджер /owner панелинен да каттоо кылса болот."
        );
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
