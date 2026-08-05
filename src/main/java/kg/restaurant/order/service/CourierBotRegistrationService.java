package kg.restaurant.order.service;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.repository.CourierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Telegram бот аркылуу курьер каттоо — бир кадам, дароо активде */
@Service
public class CourierBotRegistrationService {

    private final CourierRepository courierRepository;
    private final TelegramService telegramService;

    public CourierBotRegistrationService(
            CourierRepository courierRepository,
            TelegramService telegramService
    ) {
        this.courierRepository = courierRepository;
        this.telegramService = telegramService;
    }

    @Transactional
    public Courier registerOrActivate(String chatId, String name) {
        Optional<Courier> existing = courierRepository.findByTelegramChatId(chatId);
        if (existing.isPresent()) {
            Courier courier = existing.get();
            courier.setName(name);
            courier.setActive(true);
            courier.setOnline(true);
            return courierRepository.save(courier);
        }

        Courier courier = new Courier();
        courier.setName(name);
        courier.setTelegramChatId(chatId);
        courier.setActive(true);
        courier.setOnline(true);
        return courierRepository.save(courier);
    }

    public void sendWelcome(String chatId, Courier courier, boolean isNew) {
        String greeting = isNew
                ? "✅ Катталдыңыз!"
                : "✅ Кайра активдештирildi!";

        telegramService.sendToCourier(
                chatId,
                greeting + "\n\n"
                        + "👤 " + courier.getName() + "\n\n"
                        + "📦 Заказ даяр болгондо бул жерге келет:\n"
                        + "• кардардын дареги\n"
                        + "• телефону\n"
                        + "• заказ номери\n\n"
                        + "Жеткиргенден кийин «✅ Жеткирдим» басыңыз.\n\n"
                        + "Эч нерсе кerek эмес — Telegram'ды ачык карта."
        );
    }

    @Transactional
    public Courier ensureActive(Courier courier) {
        if (!Boolean.TRUE.equals(courier.getActive()) || !Boolean.TRUE.equals(courier.getOnline())) {
            courier.setActive(true);
            courier.setOnline(true);
            return courierRepository.save(courier);
        }
        return courier;
    }
}
