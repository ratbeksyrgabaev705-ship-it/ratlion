package kg.restaurant.order;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RestaurantOrderServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RestaurantOrderServiceApplication.class, args);
    }

}
