package kg.restaurant.order.repository;

import kg.restaurant.order.model.PlatformConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformConfigRepository extends JpaRepository<PlatformConfig, Long> {
}
