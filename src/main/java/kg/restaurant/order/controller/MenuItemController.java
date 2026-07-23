package kg.restaurant.order.controller;

import kg.restaurant.order.model.MenuItem;
import kg.restaurant.order.repository.MenuItemRepository;
import kg.restaurant.order.service.ReceiptStorageService;
import kg.restaurant.order.service.TelegramService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/menu")
public class MenuItemController {

    private final MenuItemRepository menuItemRepository;
    private final TelegramService telegramService;
    private final ReceiptStorageService receiptStorageService;

    public MenuItemController(
            MenuItemRepository menuItemRepository,
            TelegramService telegramService,
            ReceiptStorageService receiptStorageService
    ) {
        this.menuItemRepository = menuItemRepository;
        this.telegramService = telegramService;
        this.receiptStorageService = receiptStorageService;
    }

    // Бардык тамактарды алуу
    @GetMapping
    public List<MenuItem> getAllMenuItems(
            @RequestParam(required = false) Long restaurantId
    ) {
        List<MenuItem> items = restaurantId != null
                ? menuItemRepository.findByRestaurantId(restaurantId)
                : menuItemRepository.findAll();
        return items;
    }

    /*
     * JSON МЕНЕН ТАМАК КОШУУ
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public MenuItem addMenuItemJson(@RequestBody MenuItem menuItem) {
        if (menuItem.getAvailable() == null) {
            menuItem.setAvailable(true);
        }

        MenuItem saved = menuItemRepository.save(menuItem);
        telegramService.sendMessage("🍽️ Жаңы тамак кошулду!\n" +
                "Аты: " + saved.getName() + "\n" +
                "Категория: " + saved.getCategory() + "\n" +
                "Баасы: " + saved.getPrice() + " сом");
        return saved;
    }

    /*
     * ГАЛЕРЕЯДАН СҮРӨТ МЕНЕН ТАМАК КОШУУ
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MenuItem addMenuItemWithImage(
            @RequestParam String nameKg,
            @RequestParam String nameRu,
            @RequestParam String ingredientsKg,
            @RequestParam String ingredientsRu,
            @RequestParam(required = false) String descriptionKg,
            @RequestParam(required = false) String descriptionRu,
            @RequestParam String categoryKg,
            @RequestParam String categoryRu,
            @RequestParam Double price,
            @RequestParam(required = false) Integer weight,
            @RequestParam(required = false) Integer spicyLevel,
            @RequestParam(required = false) Long restaurantId,
            @RequestParam(required = false) MultipartFile image
    ) throws IOException {

        MenuItem menuItem = new MenuItem();
        menuItem.setRestaurantId(restaurantId);

        // Эски талаалар
        menuItem.setName(nameKg);
        menuItem.setIngredients(ingredientsKg);
        menuItem.setDescription(descriptionKg);
        menuItem.setCategory(categoryKg);

        // Кыргызча
        menuItem.setNameKg(nameKg);
        menuItem.setIngredientsKg(ingredientsKg);
        menuItem.setDescriptionKg(descriptionKg);
        menuItem.setCategoryKg(categoryKg);

        // Орусча
        menuItem.setNameRu(nameRu);
        menuItem.setIngredientsRu(ingredientsRu);
        menuItem.setDescriptionRu(descriptionRu);
        menuItem.setCategoryRu(categoryRu);

        menuItem.setPrice(price);
        menuItem.setWeight(weight);
        menuItem.setSpicyLevel(spicyLevel == null ? 0 : spicyLevel);
        menuItem.setAvailable(true);

        if (image != null && !image.isEmpty()) {
            String contentType = image.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("Файл сүрөт форматында болушу керек");
            }
            if (image.getSize() > 8 * 1024 * 1024) {
                throw new IllegalArgumentException("Сүрөттүн көлөмү 8 MBдан чоң болбошу керек");
            }

            String originalFileName = image.getOriginalFilename();
            if (originalFileName == null || originalFileName.isBlank()) {
                originalFileName = "food.jpg";
            }

            originalFileName = Paths.get(originalFileName).getFileName().toString();
            String fileExtension = getFileExtension(originalFileName);
            String fileName = UUID.randomUUID() + fileExtension;

            Path uploadDirectory = receiptStorageService.getMenuUploadFolder();
            Files.createDirectories(uploadDirectory);

            Path targetFile = uploadDirectory.resolve(fileName).normalize();
            image.transferTo(targetFile.toFile());

            menuItem.setImage("/uploads/menu/" + fileName);
        }

        MenuItem saved = menuItemRepository.save(menuItem);
        telegramService.sendMessage("🖼️ Жаңы тамак кошулду (сүрөт менен)!\n" +
                "Аты: " + saved.getName() + "\n" +
                "Категория: " + saved.getCategory() + "\n" +
                "Баасы: " + saved.getPrice() + " сом");
        return saved;
    }

    // Тамакты толугу менен өзгөртүү
    @PutMapping("/{id}")
    public MenuItem updateMenuItem(@PathVariable Long id, @RequestBody MenuItem updatedItem) {
        MenuItem item = menuItemRepository.findById(id).orElse(null);
        if (item == null) return null;

        item.setName(updatedItem.getName());
        item.setDescription(blankToNull(updatedItem.getDescription()));
        item.setIngredients(updatedItem.getIngredients());
        item.setCategory(updatedItem.getCategory());

        item.setNameKg(updatedItem.getNameKg());
        item.setDescriptionKg(blankToNull(updatedItem.getDescriptionKg()));
        item.setIngredientsKg(updatedItem.getIngredientsKg());
        item.setCategoryKg(updatedItem.getCategoryKg());

        item.setNameRu(updatedItem.getNameRu());
        item.setDescriptionRu(blankToNull(updatedItem.getDescriptionRu()));
        item.setIngredientsRu(updatedItem.getIngredientsRu());
        item.setCategoryRu(updatedItem.getCategoryRu());

        item.setPrice(updatedItem.getPrice());
        item.setWeight(updatedItem.getWeight());
        item.setSpicyLevel(updatedItem.getSpicyLevel());

        if (updatedItem.getImage() != null && !updatedItem.getImage().isBlank()) {
            item.setImage(updatedItem.getImage());
        }
        if (updatedItem.getAvailable() != null) {
            item.setAvailable(updatedItem.getAvailable());
        }

        MenuItem saved = menuItemRepository.save(item);
        telegramService.sendMessage("✏️ Тамак өзгөртүлдү!\n" +
                "ID: " + saved.getId() + "\n" +
                "Аты: " + saved.getName());
        return saved;
    }

    // Тамакты бар же жок кылуу
    @PutMapping("/{id}/availability")
    public MenuItem changeAvailability(@PathVariable Long id, @RequestParam Boolean available) {
        MenuItem item = menuItemRepository.findById(id).orElse(null);
        if (item == null) return null;
        item.setAvailable(available);
        MenuItem saved = menuItemRepository.save(item);
        telegramService.sendMessage("🔄 Тамактын абалы өзгөрдү!\n" +
                "Аты: " + saved.getName() + "\n" +
                "Жеткиликтүүлүк: " + (available ? "Бар" : "Жок"));
        return saved;
    }

    // Тамакты убактылуу жок кылуу
    @GetMapping("/{id}/disable")
    public MenuItem disableMenuItem(@PathVariable Long id) {
        MenuItem item = menuItemRepository.findById(id).orElse(null);
        if (item == null) return null;
        item.setAvailable(false);
        MenuItem saved = menuItemRepository.save(item);
        telegramService.sendMessage("⛔ Тамак убактылуу жок кылынды!\n" +
                "Аты: " + saved.getName());
        return saved;
    }

    // Тамакты кайра менюга чыгаруу
    @GetMapping("/{id}/enable")
    public MenuItem enableMenuItem(@PathVariable Long id) {
        MenuItem item = menuItemRepository.findById(id).orElse(null);
        if (item == null) return null;
        item.setAvailable(true);
        MenuItem saved = menuItemRepository.save(item);
        telegramService.sendMessage("✅ Тамак кайра менюга чыгарылды!\n" +
                "Аты: " + saved.getName());
        return saved;
    }

    // Тамакты толугу менен өчүрүү
    @DeleteMapping("/{id}")
    public void deleteMenuItem(@PathVariable Long id) {
        MenuItem item = menuItemRepository.findById(id).orElse(null);
        if (item != null) {
            telegramService.sendMessage("🗑️ Тамак өчүрүлдү!\n" +
                    "Аты: " + item.getName() + " (ID: " + id + ")");
        }
        menuItemRepository.deleteById(id);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String getFileExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf(".");
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return ".jpg";
        }
        String extension = fileName.substring(dotIndex).toLowerCase();
        if (!extension.equals(".jpg") && !extension.equals(".jpeg") &&
                !extension.equals(".png") && !extension.equals(".webp")) {
            return ".jpg";
        }
        return extension;
    }
}