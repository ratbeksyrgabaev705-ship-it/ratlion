package kg.restaurant.order.repository;

import kg.restaurant.order.model.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CustomerOrderRepository
        extends JpaRepository<CustomerOrder, Long> {

    /*
     * Белгилүү бир күн же ай боюнча
     * заказдарды убакыт аралыгы менен алуу.
     */
    List<CustomerOrder>
    findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            LocalDateTime start,
            LocalDateTime end
    );

    /*
     * Отчет үчүн аткарылган заказдар гана.
     */
    List<CustomerOrder>
    findByOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            String orderStatus,
            LocalDateTime start,
            LocalDateTime end
    );

    /*
     * Активдүү заказдарды жаңыдан эскиге карай алуу.
     */
    List<CustomerOrder>
    findByOrderStatusNotInOrderByCreatedAtDesc(
            List<String> excludedStatuses
    );

    long countByDisplayOrderNumberIsNotNull();

    List<CustomerOrder>
    findByOrderStatusInOrderByCreatedAtAsc(
            List<String> statuses
    );

    List<CustomerOrder>
    findByRestaurantIdAndOrderStatusInOrderByCreatedAtAsc(
            Long restaurantId,
            List<String> statuses
    );

    List<CustomerOrder>
    findByOrderStatusOrderByCreatedAtDesc(String orderStatus);

    long countByRestaurantIdAndDisplayOrderNumberIsNotNull(Long restaurantId);

    List<CustomerOrder>
    findByRestaurantIdAndOrderStatusOrderByCreatedAtDesc(
            Long restaurantId,
            String orderStatus
    );

    List<CustomerOrder>
    findByRestaurantIdAndOrderStatusNotInOrderByCreatedAtDesc(
            Long restaurantId,
            List<String> excludedStatuses
    );

    List<CustomerOrder>
    findByRestaurantIdAndOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            Long restaurantId,
            String orderStatus,
            LocalDateTime start,
            LocalDateTime end
    );

    List<CustomerOrder>
    findByRestaurantIdOrderByCreatedAtDesc(Long restaurantId);

    List<CustomerOrder>
    findByRestaurantIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            Long restaurantId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<CustomerOrder>
    findByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndOrderStatusInOrderByCreatedAtDesc(
            LocalDateTime start,
            LocalDateTime end,
            List<String> statuses
    );

    List<CustomerOrder>
    findByRestaurantIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanAndOrderStatusInOrderByCreatedAtDesc(
            Long restaurantId,
            LocalDateTime start,
            LocalDateTime end,
            List<String> statuses
    );

    /** Отчёттор: гана DELIVERED, deliveredAt боюнча (legacy: createdAt fallback) */
    @Query("""
            SELECT o FROM CustomerOrder o
            WHERE o.orderStatus = 'DELIVERED'
            AND (:restaurantId IS NULL OR o.restaurantId = :restaurantId)
            AND COALESCE(o.deliveredAt, o.createdAt) >= :start
            AND COALESCE(o.deliveredAt, o.createdAt) < :end
            ORDER BY COALESCE(o.deliveredAt, o.createdAt) DESC
            """)
    List<CustomerOrder> findDeliveredForReport(
            @Param("restaurantId") Long restaurantId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    long countByRestaurantIdAndOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Long restaurantId,
            String orderStatus,
            LocalDateTime start,
            LocalDateTime end
    );

    long countByOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            String orderStatus,
            LocalDateTime start,
            LocalDateTime end
    );

    List<CustomerOrder> findByOrderStatusAndCourierIdOrderByCourierAtAsc(
            String orderStatus,
            Long courierId
    );

    List<CustomerOrder> findByOrderStatusAndCourierIdIsNullOrderByCourierAtAsc(
            String orderStatus
    );

    /** Курьерге суроо — даярдалууда, эч ким албagan */
    List<CustomerOrder> findByOrderStatusAndCourierIdIsNullOrderByCookingStartedAtDesc(
            String orderStatus
    );

    List<CustomerOrder> findByOrderStatusAndCourierIdOrderByDeliveredAtDesc(
            String orderStatus,
            Long courierId
    );

    List<CustomerOrder> findByCourierIdAndOrderStatusInOrderByCreatedAtAsc(
            Long courierId,
            List<String> statuses
    );

    @Query("SELECT COUNT(o) FROM CustomerOrder o WHERE o.courierId = :courierId "
            + "AND o.orderStatus = 'DELIVERED' AND o.deliveredAt >= :since")
    long countDeliveredSince(
            @Param("courierId") Long courierId,
            @Param("since") LocalDateTime since
    );

    List<CustomerOrder> findTop8ByCourierIdAndOrderStatusOrderByDeliveredAtDesc(
            Long courierId,
            String orderStatus
    );

    List<CustomerOrder> findTop40ByOrderStatusAndCourierIdIsNotNullOrderByDeliveredAtDesc(
            String orderStatus
    );

    List<CustomerOrder> findByOrderStatusAndCourierIdIsNullAndActiveOfferCourierIdIsNotNullAndOfferExpiresAtBefore(
            String orderStatus,
            LocalDateTime expiresBefore
    );

    long countByCourierIdAndOrderStatusIn(Long courierId, List<String> statuses);

    boolean existsByCourierIdAndRestaurantIdAndOrderStatus(
            Long courierId,
            Long restaurantId,
            String orderStatus
    );
}