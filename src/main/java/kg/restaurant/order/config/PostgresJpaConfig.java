package kg.restaurant.order.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("prod")
@ConditionalOnProperty(name = "USE_POSTGRES", havingValue = "true")
public class PostgresJpaConfig {

    @Bean
    public HibernatePropertiesCustomizer postgresDialectCustomizer() {
        return properties -> properties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
    }
}
