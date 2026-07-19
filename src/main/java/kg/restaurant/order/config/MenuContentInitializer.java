package kg.restaurant.order.config;

import kg.restaurant.order.model.MenuItem;
import kg.restaurant.order.repository.MenuItemRepository;
import kg.restaurant.order.service.MenuContentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MenuContentInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MenuContentInitializer.class);

    private final MenuItemRepository menuItemRepository;
    private final MenuContentService menuContentService;

    public MenuContentInitializer(
            MenuItemRepository menuItemRepository,
            MenuContentService menuContentService
    ) {
        this.menuItemRepository = menuItemRepository;
        this.menuContentService = menuContentService;
    }

    @Override
    public void run(String... args) {
        List<MenuItem> items = menuItemRepository.findAll();
        if (items.isEmpty()) {
            return;
        }

        int updatedCount = 0;
        for (MenuItem item : items) {
            MenuItem enriched = menuContentService.enrich(item);
            if (menuContentService.shouldPersistEnrichment(item, enriched)) {
                menuItemRepository.save(enriched);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            log.info("Menu content enriched for {} item(s)", updatedCount);
        }
    }
}
