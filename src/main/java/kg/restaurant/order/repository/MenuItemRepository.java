package kg.restaurant.order.repository;

import kg.restaurant.order.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    java.util.List<MenuItem> findByRestaurantId(Long restaurantId);
}