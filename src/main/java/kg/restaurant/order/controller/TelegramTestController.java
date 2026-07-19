package kg.restaurant.order.controller;

import kg.restaurant.order.service.TelegramService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
public class TelegramTestController {

    private final TelegramService telegramService;

    public TelegramTestController(TelegramService telegramService) {
        this.telegramService = telegramService;
    }

    @GetMapping("/test")
    public Map<String, String> testTelegram() {
        telegramService.sendToManager("✅ Telegram иштейт! Тест ийгиликтүү.");
        return Map.of(
                "status", "ok",
                "message", "Telegramга тест билдирүү жиберildi. Телефонуңузду текшериңиз."
        );
    }
}
