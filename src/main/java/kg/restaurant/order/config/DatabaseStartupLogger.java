package kg.restaurant.order.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class DatabaseStartupLogger implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseStartupLogger.class);

    private final Environment environment;

    public DatabaseStartupLogger(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        String databaseUrl = environment.getProperty("DATABASE_URL", "");
        boolean postgres = environment.getProperty("USE_POSTGRES", "false").equalsIgnoreCase("true")
                || (databaseUrl != null && !databaseUrl.isBlank());
        if (postgres) {
            log.info("✅ Маалымат базасы: PostgreSQL (deploy кийин сакталат)");
        } else {
            log.warn("⚠️ Маалымат базасы: H2 файл /app/data — PostgreSQL кошулбogon (DATABASE_URL жок)");
        }
        log.info("📁 Сүрөт/чек файлдары: {}", environment.getProperty("app.upload-dir", "/app/data/uploads"));
    }
}
