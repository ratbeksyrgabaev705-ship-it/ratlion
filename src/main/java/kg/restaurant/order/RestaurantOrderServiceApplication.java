package kg.restaurant.order;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RestaurantOrderServiceApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(RestaurantOrderServiceApplication.class);
        String databaseUrl = System.getenv("DATABASE_URL");
        if (databaseUrl != null && !databaseUrl.isBlank()) {
            app.setAdditionalProfiles("postgres");
        }
        app.run(args);
    }

}
