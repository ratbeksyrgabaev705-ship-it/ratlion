package kg.restaurant.order.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Render.com: DATABASE_URL бар болсо PostgreSQL — маалымат deploy'дан кийин сакталат.
 */
@Configuration
@Profile("prod")
@ConditionalOnProperty(name = "DATABASE_URL")
public class ProductionDatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(ProductionDatabaseConfig.class);

    @Bean
    @Primary
    public DataSource postgresDataSource(@Value("${DATABASE_URL}") String databaseUrl) {
        ParsedUrl parsed = ParsedUrl.from(databaseUrl);
        log.info("PostgreSQL: {}:{}/{}", parsed.host(), parsed.port(), parsed.database());

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(parsed.jdbcUrl());
        config.setUsername(parsed.username());
        config.setPassword(parsed.password());
        config.setMaximumPoolSize(5);
        config.setConnectionTimeout(30_000);
        config.setInitializationFailTimeout(60_000);
        return new HikariDataSource(config);
    }

    record ParsedUrl(String jdbcUrl, String username, String password, String host, int port, String database) {

        static ParsedUrl from(String raw) {
            if (raw == null || raw.isBlank()) {
                throw new IllegalArgumentException("DATABASE_URL бош");
            }
            String url = raw.trim();

            if (url.startsWith("jdbc:postgresql://") || url.startsWith("jdbc:postgres://")) {
                return new ParsedUrl(ensureSsl(url), "", "", "", 5432, "");
            }

            String normalized = url;
            if (normalized.startsWith("postgres://")) {
                normalized = "postgresql://" + normalized.substring("postgres://".length());
            }
            if (!normalized.startsWith("postgresql://")) {
                throw new IllegalArgumentException("DATABASE_URL форматы: postgresql://...");
            }

            normalized = normalized.substring("postgresql://".length());
            int at = normalized.lastIndexOf('@');
            if (at < 0) {
                throw new IllegalArgumentException("DATABASE_URL: login/password жок");
            }

            String userInfo = normalized.substring(0, at);
            String hostPart = normalized.substring(at + 1);

            String username = "";
            String password = "";
            int colon = userInfo.indexOf(':');
            if (colon >= 0) {
                username = decode(userInfo.substring(0, colon));
                password = decode(userInfo.substring(colon + 1));
            } else {
                username = decode(userInfo);
            }

            int slash = hostPart.indexOf('/');
            if (slash < 0) {
                throw new IllegalArgumentException("DATABASE_URL: базанын аты жок");
            }

            String hostPort = hostPart.substring(0, slash);
            String database = hostPart.substring(slash + 1);
            int q = database.indexOf('?');
            if (q >= 0) {
                database = database.substring(0, q);
            }

            String host;
            int port = 5432;
            if (hostPort.startsWith("[")) {
                int end = hostPort.indexOf(']');
                host = hostPort.substring(1, end);
                if (hostPort.length() > end + 1 && hostPort.charAt(end + 1) == ':') {
                    port = Integer.parseInt(hostPort.substring(end + 2));
                }
            } else {
                int portColon = hostPort.lastIndexOf(':');
                if (portColon > 0 && hostPort.indexOf(':') == portColon) {
                    host = hostPort.substring(0, portColon);
                    port = Integer.parseInt(hostPort.substring(portColon + 1));
                } else {
                    host = hostPort;
                }
            }

            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database + "?sslmode=require";
            return new ParsedUrl(jdbcUrl, username, password, host, port, database);
        }

        private static String decode(String value) {
            if (value == null || value.isEmpty()) {
                return "";
            }
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        }

        private static String ensureSsl(String jdbc) {
            if (jdbc.contains("sslmode=")) {
                return jdbc;
            }
            return jdbc + (jdbc.contains("?") ? "&" : "?") + "sslmode=require";
        }
    }
}
