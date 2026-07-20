package kg.restaurant.order.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.chat.id:}")
    private String chatId;

    @Value("${telegram.manager.chat.id:}")
    private String managerChatId;

    public void sendMessage(String text) {
        sendToChat(resolveManagerChatId(), text);
    }

    public void sendToManager(String text) {
        sendToChat(resolveManagerChatId(), text);
    }

    public void sendToCourier(String courierChatId, String text) {
        sendToChat(courierChatId, text);
    }

    public void sendToChat(String targetChatId, String text) {
        sendToChatWithResult(targetChatId, text);
    }

    /** Telegram жиберүү натыйжасы — админ панелине ката көрсөтүү үчүн */
    public TelegramSendResult sendToChatWithResult(String targetChatId, String text) {
        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram иштебейт: bot token бош");
            return TelegramSendResult.ofFailure("Telegram бот орнотулган эмес (TELEGRAM_BOT_TOKEN)");
        }

        if (targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram иштебейт: chat id бош");
            return TelegramSendResult.ofFailure("Telegram chat ID бош");
        }

        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(
                    Map.of(
                            "chat_id", targetChatId,
                            "text", text
                    ),
                    headers
            );

            String response = restTemplate.postForObject(url, request, String.class);

            if (response != null && response.contains("\"ok\":false")) {
                log.error("Telegram API катасы: {}", response);
                return TelegramSendResult.ofFailure(humanizeTelegramError(response));
            }

            return TelegramSendResult.ofSuccess();

        } catch (Exception e) {
            log.error("Telegram катасы: {}", e.getMessage());
            return TelegramSendResult.ofFailure("Telegram байланыш катасы: " + e.getMessage());
        }
    }

    private String humanizeTelegramError(String apiResponse) {
        String lower = apiResponse.toLowerCase();
        if (lower.contains("bot was blocked")) {
            return "Курьер ботту блокtogon — Telegram'да ботту ачыңыз";
        }
        if (lower.contains("chat not found") || lower.contains("user not found")) {
            return "Telegram ID туура эмес — userinfobot же боттон /start аркылуу ID алгыла";
        }
        if (lower.contains("can't initiate conversation") || lower.contains("bot is not a member")) {
            return "Курьер RATLION ботун ачып /start басishi кerek — андан кийин эскертүү келет";
        }
        return "Telegram жиберилбedi — ID туурабы жана ботко /start basылганбы текшериңиз";
    }

    public record TelegramSendResult(boolean success, String error) {
        public static TelegramSendResult ofSuccess() {
            return new TelegramSendResult(true, null);
        }

        public static TelegramSendResult ofFailure(String error) {
            return new TelegramSendResult(false, error);
        }
    }

    public boolean isConfigured() {
        return botToken != null && !botToken.isBlank();
    }

    private String resolveManagerChatId() {
        if (managerChatId != null && !managerChatId.isBlank()) {
            return managerChatId;
        }
        return chatId;
    }
}
