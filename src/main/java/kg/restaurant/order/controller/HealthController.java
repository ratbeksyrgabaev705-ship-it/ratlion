package kg.restaurant.order.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired
    private Environment environment;

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "ok");

        String databaseUrl = environment.getProperty("DATABASE_URL", "");
        boolean postgresConfigured = environment.getProperty("USE_POSTGRES", "false").equalsIgnoreCase("true")
                || !databaseUrl.isBlank();
        result.put("postgresConfigured", postgresConfigured);

        if (dataSource != null) {
            try (Connection conn = dataSource.getConnection()) {
                String product = conn.getMetaData().getDatabaseProductName();
                result.put("database", product);
                result.put("persistent", product.toLowerCase().contains("postgres"));
            } catch (Exception e) {
                result.put("database", "unknown");
                result.put("databaseError", e.getMessage());
            }
        }

        return result;
    }
}
