package kg.restaurant.order.repository;

import kg.restaurant.order.model.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    Optional<Restaurant> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Restaurant> findByActiveTrueOrderByNameAsc();
}
