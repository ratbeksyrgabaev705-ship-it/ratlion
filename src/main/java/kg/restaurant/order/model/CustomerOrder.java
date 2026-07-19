package kg.restaurant.order.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
public class CustomerOrder {

    private static final ZoneId BISHKEK_ZONE =
            ZoneId.of("Asia/Bishkek");


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    private String customerName;


    private String phone;


    private String address;


    private String comment;

    /** Тамакка тийиштүү комментарий — ресторан көрөт */
    private String foodComment;


    /*
     * Азырынча заказдагы бардык тамактар
     * бир текст катары сакталат:
     *
     * "Лагман x2, Плов x1"
     */
    @Column(length = 3000)
    private String itemName;


    private Integer quantity;


    private Double totalPrice;


    private Double paymentAmount;


    private String receiptImagePath;


    /*
     * Төлөмдүн абалы
     *
     * WAITING_PAYMENT - төлөм күтүлүүдө
     * PAID - төлөндү
     */
    private String paymentStatus = "WAITING_PAYMENT";


    /*
     * Кafe башкычында көрсөтүлүүчү номер (кабыл алынганда берилет)
     * Мисалы: "ОД 1", "ОД 2"
     */
    private String displayOrderNumber;


    private Long courierId;


    /** Кайсы ресторанга тиешелүү заказ */
    private Long restaurantId;


    /*
     * Заказдын абалы
     *
     * NEW - жаңы заказ
     * ACCEPTED - кабыл алынды
     * COOKING - даярдалууда
     * READY - даяр
     * GIVEN_TO_COURIER - курьерге берилди
     * DELIVERED - жеткирилди
     * CANCELLED - четке кагылды
     */
    private String orderStatus = "NEW";


    /*
     * Заказ түзүлгөн убакыт
     */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime acceptedAt;
    private LocalDateTime cookingStartedAt;
    private LocalDateTime readyAt;
    private LocalDateTime courierAt;
    private LocalDateTime deliveredAt;

    /** Учурдагы OFFER кайсы курьерде */
    private Long activeOfferCourierId;

    /** Ротация индекси (айлануу) */
    private Integer offerRotationIndex = 0;

    /** OFFER мөөнөтү — кийин кийинки курьерге */
    private LocalDateTime offerExpiresAt;

    /** RATLION оператору (accept/reject) */
    private String operatorName;

    public CustomerOrder() {

    }

    @PrePersist
    public void beforeSave() {


        if (createdAt == null) {

            createdAt =
                    LocalDateTime.now(BISHKEK_ZONE);
        }


        if (
                paymentStatus == null
                        || paymentStatus.isBlank()
        ) {

            paymentStatus =
                    "WAITING_PAYMENT";
        }



        if (
                orderStatus == null
                        || orderStatus.isBlank()
        ) {

            orderStatus =
                    "NEW";
        }



        if (quantity == null) {

            quantity = 0;
        }



        if (totalPrice == null) {

            totalPrice = 0.0;
        }



        if (paymentAmount == null) {

            paymentAmount = totalPrice;
        }

    }




    public Long getId() {

        return id;
    }



    public String getCustomerName() {

        return customerName;
    }



    public void setCustomerName(
            String customerName
    ) {

        this.customerName = customerName;
    }




    public String getPhone() {

        return phone;
    }



    public void setPhone(
            String phone
    ) {

        this.phone = phone;
    }




    public String getAddress() {

        return address;
    }



    public void setAddress(
            String address
    ) {

        this.address = address;
    }




    public String getComment() {

        return comment;
    }



    public void setComment(
            String comment
    ) {

        this.comment = comment;
    }


    public String getFoodComment() {
        return foodComment;
    }


    public void setFoodComment(String foodComment) {
        this.foodComment = foodComment;
    }


    public String getItemName() {

        return itemName;
    }



    public void setItemName(
            String itemName
    ) {

        this.itemName = itemName;
    }




    public Integer getQuantity() {

        return quantity;
    }



    public void setQuantity(
            Integer quantity
    ) {

        this.quantity = quantity;
    }




    public Double getTotalPrice() {

        return totalPrice;
    }



    public void setTotalPrice(
            Double totalPrice
    ) {

        this.totalPrice = totalPrice;
    }




    public Double getPaymentAmount() {

        return paymentAmount;
    }



    public void setPaymentAmount(
            Double paymentAmount
    ) {

        this.paymentAmount = paymentAmount;
    }




    public String getReceiptImagePath() {

        return receiptImagePath;
    }



    public void setReceiptImagePath(
            String receiptImagePath
    ) {

        this.receiptImagePath = receiptImagePath;
    }




    public String getDisplayOrderNumber() {

        return displayOrderNumber;
    }



    public void setDisplayOrderNumber(
            String displayOrderNumber
    ) {

        this.displayOrderNumber = displayOrderNumber;
    }



    public Long getCourierId() {

        return courierId;
    }



    public void setCourierId(Long courierId) {

        this.courierId = courierId;
    }



    public Long getRestaurantId() {

        return restaurantId;
    }



    public void setRestaurantId(Long restaurantId) {

        this.restaurantId = restaurantId;
    }



    public String getPaymentStatus() {

        return paymentStatus;
    }



    public void setPaymentStatus(
            String paymentStatus
    ) {

        this.paymentStatus = paymentStatus;
    }




    public String getOrderStatus() {

        return orderStatus;
    }



    public void setOrderStatus(
            String orderStatus
    ) {

        this.orderStatus = orderStatus;
    }




    public LocalDateTime getCreatedAt() {

        return createdAt;
    }



    public void setCreatedAt(
            LocalDateTime createdAt
    ) {

        this.createdAt = createdAt;
    }

    public LocalDateTime getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(LocalDateTime acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public LocalDateTime getCookingStartedAt() {
        return cookingStartedAt;
    }

    public void setCookingStartedAt(LocalDateTime cookingStartedAt) {
        this.cookingStartedAt = cookingStartedAt;
    }

    public LocalDateTime getReadyAt() {
        return readyAt;
    }

    public void setReadyAt(LocalDateTime readyAt) {
        this.readyAt = readyAt;
    }

    public LocalDateTime getCourierAt() {
        return courierAt;
    }

    public void setCourierAt(LocalDateTime courierAt) {
        this.courierAt = courierAt;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public String getOperatorName() {
        return operatorName;
    }

    public void setOperatorName(String operatorName) {
        this.operatorName = operatorName;
    }

    public Long getActiveOfferCourierId() {
        return activeOfferCourierId;
    }

    public void setActiveOfferCourierId(Long activeOfferCourierId) {
        this.activeOfferCourierId = activeOfferCourierId;
    }

    public Integer getOfferRotationIndex() {
        return offerRotationIndex;
    }

    public void setOfferRotationIndex(Integer offerRotationIndex) {
        this.offerRotationIndex = offerRotationIndex;
    }

    public LocalDateTime getOfferExpiresAt() {
        return offerExpiresAt;
    }

    public void setOfferExpiresAt(LocalDateTime offerExpiresAt) {
        this.offerExpiresAt = offerExpiresAt;
    }

}