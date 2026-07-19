package kg.restaurant.order.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Render.com: DATABASE_URL бар болсо PostgreSQL — маалымат deploy'дан кийин сакталат.
 * Жок болсо application-prod.properties'теги H2 file иштейт.
 */
@Configuration
@Profile("prod")
@ConditionalOnProperty(name = "DATABASE_URL")
public class ProductionDatabaseConfig {

    @Bean
    @Primary
    public DataSource postgresDataSource(@Value("${DATABASE_URL}") String databaseUrl) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(toJdbcUrl(databaseUrl));
        config.setMaximumPoolSize(5);
        config.setConnectionTimeout(30_000);
        return new HikariDataSource(config);
    }

    static String toJdbcUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("DATABASE_URL бош");
        }
        if (url.startsWith("jdbc:")) {
            return url;
        }
        try {
            URI uri = new URI(url.replace("postgres://", "postgresql://"));
            String userInfo = uri.getUserInfo();
            String user = "";
            String pass = "";
            if (userInfo != null && !userInfo.isBlank()) {
                int colon = userInfo.indexOf(':');
                if (colon >= 0) {
                    user = URLEncoder.encode(userInfo.substring(0, colon), StandardCharsets.UTF_8);
                    pass = URLEncoder.encode(userInfo.substring(colon + 1), StandardCharsets.UTF_8);
                } else {
                    user = URLEncoder.encode(userInfo, StandardCharsets.UTF_8);
                }
            }
            String dbName = uri.getPath();
            if (dbName != null && dbName.startsWith("/")) {
                dbName = dbName.substring(1);
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            return "jdbc:postgresql://" + uri.getHost() + ":" + port + "/" + dbName
                    + "?user=" + user + "&password=" + pass + "&sslmode=require";
        } catch (Exception e) {
            throw new IllegalArgumentException("DATABASE_URL туура эмес: " + url, e);
        }
    }
}
