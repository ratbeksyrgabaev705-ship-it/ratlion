package kg.restaurant.order.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("prod")
@ConditionalOnExpression(
        "'${USE_POSTGRES:false}' == 'true' "
                + "or ('${DATABASE_URL:}' != null and !'${DATABASE_URL:}'.isEmpty())"
)
public class PostgresJpaConfig {

    @Bean
    public HibernatePropertiesCustomizer postgresDialectCustomizer() {
        return properties -> properties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
    }
}
