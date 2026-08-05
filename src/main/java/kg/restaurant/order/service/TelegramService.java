package kg.restaurant.order.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

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

    public String getDispatcherChatId() {
        return resolveManagerChatId();
    }

    public boolean isDispatcherChat(String chatId) {
        if (chatId == null || chatId.isBlank()) {
            return false;
        }
        String dispatcher = resolveManagerChatId();
        return dispatcher != null && dispatcher.equals(chatId);
    }

    public TelegramMessageResult sendPhotoWithInlineKeyboard(
            String targetChatId,
            String photoUrl,
            String caption,
            List<List<Map<String, String>>> keyboard
    ) {
        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", targetChatId);
        body.put("photo", photoUrl);
        body.put("caption", caption);
        body.put("reply_markup", Map.of("inline_keyboard", keyboard));
        return callApiWithMessage("sendPhoto", body);
    }

    /** Чек файлын түз Telegram'га жиберет (URL кerek эмес) */
    public TelegramMessageResult sendPhotoFileWithInlineKeyboard(
            String targetChatId,
            Path photoFile,
            String caption,
            List<List<Map<String, String>>> keyboard
    ) {
        if (botToken == null || botToken.isBlank()) {
            return TelegramMessageResult.ofFailure("Telegram бот орнотулган эмес");
        }
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendPhoto";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("chat_id", targetChatId);
            body.add("caption", caption);
            body.add("photo", new FileSystemResource(photoFile.toFile()));
            body.add("reply_markup", objectMapper.writeValueAsString(
                    Map.of("inline_keyboard", keyboard)
            ));

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            String response = restTemplate.postForObject(url, request, String.class);
            if (response != null && response.contains("\"ok\":false")) {
                log.error("Telegram sendPhoto file катасы: {}", response);
                return TelegramMessageResult.ofFailure(humanizeTelegramError(response));
            }
            return TelegramMessageResult.ofSuccess(extractMessageId(response));
        } catch (Exception e) {
            log.error("Telegram sendPhoto file катасы: {}", e.getMessage());
            return TelegramMessageResult.ofFailure("Чек жиберилбedi: " + e.getMessage());
        }
    }

    public TelegramMessageResult sendMessageWithInlineKeyboard(
            String targetChatId,
            String text,
            List<List<Map<String, String>>> keyboard
    ) {
        Map<String, Object> body = Map.of(
                "chat_id", targetChatId,
                "text", text,
                "reply_markup", Map.of("inline_keyboard", keyboard)
        );
        return callApiWithMessage("sendMessage", body);
    }

    public TelegramSendResult answerCallbackQuery(String callbackQueryId, String text, boolean showAlert) {
        Map<String, Object> body = new HashMap<>();
        body.put("callback_query_id", callbackQueryId);
        if (text != null && !text.isBlank()) {
            body.put("text", text);
        }
        body.put("show_alert", showAlert);
        return callApi("answerCallbackQuery", body);
    }

    public TelegramSendResult editMessageCaption(String chatId, Integer messageId, String caption) {
        if (chatId == null || chatId.isBlank() || messageId == null) {
            return TelegramSendResult.ofFailure("Message ID жок");
        }
        return callApi("editMessageCaption", Map.of(
                "chat_id", chatId,
                "message_id", messageId,
                "caption", caption == null ? "" : caption
        ));
    }

    public TelegramSendResult editMessageReplyMarkup(String chatId, Integer messageId, Object replyMarkup) {
        if (chatId == null || chatId.isBlank() || messageId == null) {
            return TelegramSendResult.ofFailure("Message ID жок");
        }
        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("message_id", messageId);
        body.put("reply_markup", replyMarkup == null
                ? Map.of("inline_keyboard", List.of())
                : replyMarkup);
        return callApi("editMessageReplyMarkup", body);
    }

    public record TelegramMessageResult(boolean success, String error, Integer messageId) {
        public static TelegramMessageResult ofSuccess(Integer messageId) {
            return new TelegramMessageResult(true, null, messageId);
        }

        public static TelegramMessageResult ofFailure(String error) {
            return new TelegramMessageResult(false, error, null);
        }
    }

    /** Web App баскычы менен билдирүү */
    public TelegramSendResult sendWithWebAppButton(
            String targetChatId,
            String text,
            String buttonText,
            String webAppUrl
    ) {
        if (botToken == null || botToken.isBlank()) {
            return TelegramSendResult.ofFailure("Telegram бот орнотулган эмес (TELEGRAM_BOT_TOKEN)");
        }
        if (targetChatId == null || targetChatId.isBlank()) {
            return TelegramSendResult.ofFailure("Telegram chat ID бош");
        }

        Map<String, Object> webApp = Map.of("url", webAppUrl);
        Map<String, Object> button = Map.of(
                "text", buttonText,
                "web_app", webApp
        );
        Map<String, Object> body = Map.of(
                "chat_id", targetChatId,
                "text", text,
                "reply_markup", Map.of("inline_keyboard", List.of(List.of(button)))
        );
        return callApi("sendMessage", body);
    }

    /** «Заказ берүү» меню баскычын өчүрүү */
    public TelegramSendResult clearMenuButton() {
        return callApi("setChatMenuButton", Map.of(
                "menu_button", Map.of("type", "default")
        ));
    }

    /** Webhook — Telegram боттон /start алуу үчүн */
    public TelegramSendResult setWebhook(String webhookUrl) {
        return callApi("setWebhook", Map.of("url", webhookUrl));
    }

    private TelegramSendResult callApi(String method, Map<String, Object> body) {
        TelegramMessageResult result = callApiWithMessage(method, body);
        if (result.success()) {
            return TelegramSendResult.ofSuccess();
        }
        return TelegramSendResult.ofFailure(result.error());
    }

    private TelegramMessageResult callApiWithMessage(String method, Map<String, Object> body) {
        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram иштебейт: bot token бош");
            return TelegramMessageResult.ofFailure("Telegram бот орнотулган эмес (TELEGRAM_BOT_TOKEN)");
        }
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/" + method;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            String response = restTemplate.postForObject(url, request, String.class);
            if (response != null && response.contains("\"ok\":false")) {
                log.error("Telegram API {} катасы: {}", method, response);
                return TelegramMessageResult.ofFailure(humanizeTelegramError(response));
            }
            return TelegramMessageResult.ofSuccess(extractMessageId(response));
        } catch (Exception e) {
            log.error("Telegram {} катасы: {}", method, e.getMessage());
            return TelegramMessageResult.ofFailure("Telegram байланыш катасы: " + e.getMessage());
        }
    }

    private Integer extractMessageId(String response) {
        if (response == null) {
            return null;
        }
        Matcher matcher = Pattern.compile("\"message_id\":(\\d+)").matcher(response);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return null;
    }

    private String resolveManagerChatId() {
        if (managerChatId != null && !managerChatId.isBlank()) {
            return managerChatId;
        }
        return chatId;
    }
}
