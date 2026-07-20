package kg.restaurant.order.repository;

import kg.restaurant.order.model.Courier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CourierRepository extends JpaRepository<Courier, Long> {

    List<Courier> findByActiveTrueOrderByNameAsc();

    List<Courier> findByActiveTrueAndOnlineTrueOrderByNameAsc();

    List<Courier> findByActiveFalseOrderByCreatedAtDesc();

    Optional<Courier> findByTelegramChatId(String telegramChatId);

    boolean existsByTelegramChatId(String telegramChatId);

    Optional<Courier> findByPhone(String phone);

    Optional<Courier> findByNicknameIgnoreCase(String nickname);

    boolean existsByNicknameIgnoreCase(String nickname);
}
