package kg.restaurant.order.config;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.repository.CourierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CourierBotBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CourierBotBootstrap.class);

    private final CourierRepository courierRepository;

    public CourierBotBootstrap(CourierRepository courierRepository) {
        this.courierRepository = courierRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int activated = 0;
        for (Courier courier : courierRepository.findAll()) {
            if (!courier.hasTelegramBot()) {
                continue;
            }
            if (!Boolean.TRUE.equals(courier.getActive()) || !Boolean.TRUE.equals(courier.getOnline())) {
                courier.setActive(true);
                courier.setOnline(true);
                courierRepository.save(courier);
                activated++;
            }
        }
        if (activated > 0) {
            log.info("Telegram курьerler авто-активдештирildi: {}", activated);
        }
    }
}
