package kg.restaurant.order.config;

import kg.restaurant.order.service.TelegramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class TelegramBotBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TelegramBotBootstrap.class);

    private final TelegramService telegramService;

    @Value("${app.public-url:http://localhost:8080}")
    private String publicUrl;

    public TelegramBotBootstrap(TelegramService telegramService) {
        this.telegramService = telegramService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!telegramService.isConfigured()) {
            return;
        }

        String base = normalizeUrl(publicUrl);
        String menuUrl = base + "/";
        String webhookUrl = base + "/api/telegram/webhook";

        var menuResult = telegramService.setMenuButton("🍔 Заказ берүү", menuUrl);
        if (menuResult.success()) {
            log.info("Telegram menu button орнотулду: {}", menuUrl);
        } else {
            log.warn("Telegram menu button орнотулган жок: {}", menuResult.error());
        }

        var webhookResult = telegramService.setWebhook(webhookUrl);
        if (webhookResult.success()) {
            log.info("Telegram webhook орнотулду: {}", webhookUrl);
        } else {
            log.warn("Telegram webhook орнотулган жок: {}", webhookResult.error());
        }
    }

    private String normalizeUrl(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:8080";
        }
        String trimmed = url.trim();
        if (trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
