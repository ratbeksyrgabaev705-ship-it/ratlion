package kg.restaurant.order.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class PlatformConfig {

    @Id
    private Long id = 1L;

    @JsonIgnore
    @Column(name = "admin_password_hash")
    private String adminPasswordHash;

    @JsonIgnore
    @Column(name = "view_password_hash")
    private String viewPasswordHash;

    public PlatformConfig() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAdminPasswordHash() {
        return adminPasswordHash;
    }

    public void setAdminPasswordHash(String adminPasswordHash) {
        this.adminPasswordHash = adminPasswordHash;
    }

    public String getViewPasswordHash() {
        return viewPasswordHash;
    }

    public void setViewPasswordHash(String viewPasswordHash) {
        this.viewPasswordHash = viewPasswordHash;
    }

    public boolean hasAdminPassword() {
        return adminPasswordHash != null && !adminPasswordHash.isBlank();
    }

    public boolean hasViewPassword() {
        return viewPasswordHash != null && !viewPasswordHash.isBlank();
    }
}
