package kg.restaurant.order.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true)
    private String slug;

    private String emoji;

    private String accentColor;

    /** Кafe номери префикси: "ОД", "FE" */
    private String orderPrefix;

    private Boolean active = true;

    /** Кардар менюсу URL */
    private String customerUrl;

    private String phone;

    private String address;

    /** Каталогто көрсөтүлүүчү кыска сүрөттөмө */
    private String tagline;

    private String logoUrl;
    private String bannerUrl;

    /** Кардар заказ кабыл алат */
    private Boolean acceptingOrders = true;

    /** Убактылуу токтотуу */
    private Boolean ordersPaused = false;

    /** Telegram чат ID — жаңы заказ келгенде билдирүү */
    private String telegramChatId;

    public Restaurant() {
    }

    public Restaurant(String name, String slug, String emoji, String accentColor, String orderPrefix) {
        this.name = name;
        this.slug = slug;
        this.emoji = emoji;
        this.accentColor = accentColor;
        this.orderPrefix = orderPrefix;
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getEmoji() {
        return emoji;
    }

    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }

    public String getAccentColor() {
        return accentColor;
    }

    public void setAccentColor(String accentColor) {
        this.accentColor = accentColor;
    }

    public String getOrderPrefix() {
        return orderPrefix;
    }

    public void setOrderPrefix(String orderPrefix) {
        this.orderPrefix = orderPrefix;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getCustomerUrl() {
        return customerUrl;
    }

    public void setCustomerUrl(String customerUrl) {
        this.customerUrl = customerUrl;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getTagline() {
        return tagline;
    }

    public void setTagline(String tagline) {
        this.tagline = tagline;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public Boolean getAcceptingOrders() {
        return acceptingOrders;
    }

    public void setAcceptingOrders(Boolean acceptingOrders) {
        this.acceptingOrders = acceptingOrders;
    }

    public Boolean getOrdersPaused() {
        return ordersPaused;
    }

    public void setOrdersPaused(Boolean ordersPaused) {
        this.ordersPaused = ordersPaused;
    }

    public String getTelegramChatId() {
        return telegramChatId;
    }

    public void setTelegramChatId(String telegramChatId) {
        this.telegramChatId = telegramChatId;
    }
}
