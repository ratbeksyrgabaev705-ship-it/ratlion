package kg.restaurant.order.repository;

import kg.restaurant.order.model.CourierNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CourierNotificationRepository extends JpaRepository<CourierNotification, Long> {

    List<CourierNotification> findByCourierIdAndReadFlagFalseOrderByCreatedAtDesc(Long courierId);

    List<CourierNotification> findByCourierIdOrderByCreatedAtDesc(Long courierId);

    long countByCourierIdAndReadFlagFalse(Long courierId);

    List<CourierNotification> findByOrderIdAndCourierIdAndTypeAndReadFlagFalse(
            Long orderId,
            Long courierId,
            String type
    );

    @Modifying
    @Query("UPDATE CourierNotification n SET n.readFlag = true WHERE n.orderId = :orderId AND n.type = 'OFFER'")
    void dismissOffersByOrderId(@Param("orderId") Long orderId);

    @Modifying
    @Query("UPDATE CourierNotification n SET n.readFlag = true WHERE n.orderId = :orderId AND n.courierId = :courierId AND n.type IN ('WAITING', 'OFFER')")
    void dismissWaitingForOrder(@Param("orderId") Long orderId, @Param("courierId") Long courierId);

    /** Баш тартуу — OFFER окуган (read) */
    @Query("SELECT n.orderId FROM CourierNotification n WHERE n.courierId = :courierId AND n.type = 'OFFER' AND n.readFlag = true")
    List<Long> findDeclinedOfferOrderIds(@Param("courierId") Long courierId);

    long countByCourierIdAndTypeAndReadFlagFalse(Long courierId, String type);

    List<CourierNotification> findTop8ByCourierIdOrderByCreatedAtDesc(Long courierId);
}
