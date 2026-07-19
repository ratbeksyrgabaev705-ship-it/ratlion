package kg.restaurant.order.service;

import kg.restaurant.order.model.Courier;
import kg.restaurant.order.model.CourierNotification;
import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.CourierNotificationRepository;
import kg.restaurant.order.repository.CourierRepository;
import kg.restaurant.order.repository.RestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CourierNotificationService {

    private static final Logger log = LoggerFactory.getLogger(CourierNotificationService.class);

    private final CourierRepository courierRepository;
    private final CourierNotificationRepository notificationRepository;
    private final RestaurantRepository restaurantRepository;
    private final TelegramService telegramService;

    public CourierNotificationService(
            CourierRepository courierRepository,
            CourierNotificationRepository notificationRepository,
            RestaurantRepository restaurantRepository,
            TelegramService telegramService
    ) {
        this.courierRepository = courierRepository;
        this.notificationRepository = notificationRepository;
        this.restaurantRepository = restaurantRepository;
        this.telegramService = telegramService;
    }

    /** Ашкана «Даярдоону баштоо» — бир курьерге OFFER (ротация CourierOfferRotationService) */
    public void sendOfferToCourier(CustomerOrder order, Courier courier, int secondsLeft) {
        String rest = restaurantName(order);
        String num = orderNumber(order);
        String text = "🔔 " + rest + " — ЖАНЫ ЗАКАЗ\n\n"
                + "🏷 " + num + "\n"
                + "📍 " + safe(order.getAddress()) + "\n"
                + "💰 " + formatAmount(order.getTotalPrice()) + " сом\n\n"
                + "⏱ " + secondsLeft + " сек ичинде жооп бер\n\n"
                + "Жеткирүүгө даярсызбы?";
        saveInApp(courier.getId(), order, "OFFER", text);
        sendExternal(courier, text);
    }

    public String restaurantNameFor(CustomerOrder order) {
        return restaurantName(order);
    }

    public String orderNumberFor(CustomerOrder order) {
        return orderNumber(order);
    }

    @Transactional
    public void dismissOfferForCourier(Long orderId, Long courierId) {
        notificationRepository.findByOrderIdAndCourierIdAndTypeAndReadFlagFalse(orderId, courierId, "OFFER")
                .forEach(n -> {
                    n.setReadFlag(true);
                    notificationRepository.save(n);
                });
    }

    /** @deprecated ротация аркылуу — CourierOfferRotationService колдон */
    @Deprecated
    public void notifyCourierOffer(CustomerOrder order) {
        String rest = restaurantName(order);
        String num = orderNumber(order);
        String text = "🔔 " + rest + " — ЖАНЫ ЗАКАЗ\n\n"
                + "🏷 " + num + "\n"
                + "📍 " + safe(order.getAddress()) + "\n"
                + "💰 " + formatAmount(order.getTotalPrice()) + " сом\n\n"
                + "Жеткирүүгө даярсызбы?";
        broadcastToAll(order, "OFFER", text);
    }

    /** Курьер кабыл алганда — «күтө тур» */
    public void notifyCourierAccepted(CustomerOrder order, Courier courier) {
        String rest = restaurantName(order);
        String num = orderNumber(order);
        String text = "👨‍🍳 " + rest + " даярдап жатат\n\n"
                + "🏷 " + num + "\n"
                + "⏳ Даяр болгончо күтө тур — азыр алба";
        saveInApp(courier.getId(), order, "WAITING", text);
        sendExternal(courier, text);
    }

    /** Ашкана «Даяр» басканда — кабыл алган курьерге гана */
    public void notifyOrderReady(CustomerOrder order) {
        if (order.getCourierId() == null) {
            return;
        }
        Courier courier = courierRepository.findById(order.getCourierId()).orElse(null);
        if (courier == null) {
            return;
        }
        String rest = restaurantName(order);
        String num = orderNumber(order);
        String text = "✅ " + rest + " — ЗАКАЗ ДАЯР!\n\n"
                + "🏷 " + num + "\n"
                + "📍 " + safe(order.getAddress()) + "\n"
                + "🛵 Азыр алып кет!";
        saveInApp(courier.getId(), order, "READY", text);
        notificationRepository.dismissWaitingForOrder(order.getId(), courier.getId());
        sendExternal(courier, text);
    }

    /** «Курьерге берүү» — акыркы эскертүү */
    public void notifyPickup(CustomerOrder order) {
        if (order.getCourierId() == null) {
            return;
        }
        Courier courier = courierRepository.findById(order.getCourierId()).orElse(null);
        if (courier == null) {
            return;
        }
        String rest = restaurantName(order);
        String num = orderNumber(order);
        String text = "🛵 " + rest + " — ресторанда күтүлөсүн!\n\n"
                + "🏷 " + num + "\n"
                + "👤 " + safe(order.getCustomerName()) + "\n"
                + "📍 " + safe(order.getAddress()) + "\n"
                + "🍽 " + safe(order.getItemName()) + "\n\n"
                + "→ /courier";
        saveInApp(courier.getId(), order, "PICKUP", text);
        sendExternal(courier, text);
    }

    @Transactional
    public void declineOffer(Long orderId, Long courierId) {
        notificationRepository.findByOrderIdAndCourierIdAndTypeAndReadFlagFalse(orderId, courierId, "OFFER")
                .forEach(n -> {
                    n.setReadFlag(true);
                    notificationRepository.save(n);
                });
    }

    @Transactional
    public void dismissOffersForOrder(Long orderId) {
        notificationRepository.dismissOffersByOrderId(orderId);
    }

    private void broadcastToAll(CustomerOrder order, String type, String text) {
        List<Courier> couriers = courierRepository.findByActiveTrueOrderByNameAsc();
        if (couriers.isEmpty()) {
            telegramService.sendToManager(
                    "⚠️ Курьер жок — " + restaurantName(order) + ": " + orderNumber(order)
            );
            return;
        }
        for (Courier courier : couriers) {
            saveInApp(courier.getId(), order, type, text);
            sendExternal(courier, text);
        }
    }

    private void saveInApp(Long courierId, CustomerOrder order, String type, String text) {
        CourierNotification n = new CourierNotification();
        n.setCourierId(courierId);
        n.setOrderId(order.getId());
        n.setRestaurantId(order.getRestaurantId());
        n.setType(type);
        n.setMessage(text);
        n.setReadFlag(false);
        notificationRepository.save(n);
    }

    private void sendExternal(Courier courier, String text) {
        String chatId = courier.getTelegramChatId();
        if (chatId != null && !chatId.isBlank() && !chatId.startsWith("phone:")) {
            telegramService.sendToCourier(chatId, text);
        }
        String phone = courier.getPhone();
        if (phone != null && !phone.isBlank()) {
            log.info("SMS → {} : {}", phone, text.replace('\n', ' '));
        }
    }

    private String restaurantName(CustomerOrder order) {
        if (order.getRestaurantId() == null) {
            return "Ресторан";
        }
        return restaurantRepository.findById(order.getRestaurantId())
                .map(Restaurant::getName)
                .orElse("Ресторан");
    }

    private String orderNumber(CustomerOrder order) {
        if (order.getDisplayOrderNumber() != null && !order.getDisplayOrderNumber().isBlank()) {
            return order.getDisplayOrderNumber();
        }
        return "#" + order.getId();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "—" : value.trim();
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
}
