package kg.restaurant.order.config;

import kg.restaurant.order.service.AdminAuthService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminAuthBootstrap implements ApplicationRunner {

    private final AdminAuthService adminAuthService;

    public AdminAuthBootstrap(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @Override
    public void run(ApplicationArguments args) {
        adminAuthService.logProtectionStatus();
    }
}
