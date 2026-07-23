package kg.restaurant.order.service;

import kg.restaurant.order.model.MenuItem;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class MenuContentService {

    private final List<MenuCatalogEntry> catalog;

    public MenuContentService(JsonMapper jsonMapper) {
        this.catalog = loadCatalog(jsonMapper);
    }

    public MenuItem enrich(MenuItem item) {
        if (item == null) {
            return null;
        }

        Optional<MenuCatalogEntry> matched = findCatalogMatch(item);
        if (matched.isPresent()) {
            applyCatalogEntry(item, matched.get());
        }

        if (MenuContentGenerator.needsIngredients(item) || hasShortIngredients(item)) {
            MenuContentGenerator.applyGeneratedIngredients(item);
        }

        syncLegacyFields(item);
        return item;
    }

    public List<MenuItem> enrichAll(List<MenuItem> items) {
        List<MenuItem> enriched = new ArrayList<>();
        for (MenuItem item : items) {
            enriched.add(enrich(copyItem(item)));
        }
        return enriched;
    }

    public boolean shouldPersistEnrichment(MenuItem original, MenuItem enriched) {
        return !safeEquals(original.getIngredientsKg(), enriched.getIngredientsKg())
                || !safeEquals(original.getIngredientsRu(), enriched.getIngredientsRu())
                || !safeEquals(original.getIngredients(), enriched.getIngredients());
    }

    private boolean matchesCatalogName(String candidate, String match) {
        if (candidate.isBlank() || match.isBlank()) {
            return false;
        }
        if (candidate.equals(match)) {
            return true;
        }
        // Short tokens like "ош" must not match inside "кош".
        if (match.length() < 4) {
            return false;
        }
        return candidate.contains(match) || match.contains(candidate);
    }

    private Optional<MenuCatalogEntry> findCatalogMatch(MenuItem item) {
        List<String> candidates = List.of(
                item.getNameKg(),
                item.getNameRu(),
                item.getName()
        );

        for (MenuCatalogEntry entry : catalog) {
            if (entry.getMatchNames() == null) {
                continue;
            }

            for (String candidate : candidates) {
                if (candidate == null || candidate.isBlank()) {
                    continue;
                }

                String normalizedCandidate = MenuContentGenerator.normalize(candidate);
                for (String matchName : entry.getMatchNames()) {
                    String normalizedMatch = MenuContentGenerator.normalize(matchName);
                    if (matchesCatalogName(normalizedCandidate, normalizedMatch)) {
                        return Optional.of(entry);
                    }
                }
            }
        }

        return Optional.empty();
    }

    private void applyCatalogEntry(MenuItem item, MenuCatalogEntry entry) {
        if (MenuContentGenerator.needsIngredients(item)) {
            item.setIngredientsKg(entry.getIngredientsKg());
            item.setIngredientsRu(entry.getIngredientsRu());
            item.setIngredients(entry.getIngredientsKg());
        } else {
            if (isTooShort(item.getIngredientsKg(), 40) && !isBlank(entry.getIngredientsKg())) {
                item.setIngredientsKg(entry.getIngredientsKg());
                item.setIngredients(entry.getIngredientsKg());
            }
            if (isTooShort(item.getIngredientsRu(), 40) && !isBlank(entry.getIngredientsRu())) {
                item.setIngredientsRu(entry.getIngredientsRu());
            }
        }

        if (isBlank(item.getCategoryKg()) && !isBlank(entry.getCategoryKg())) {
            item.setCategoryKg(entry.getCategoryKg());
        }
        if (isBlank(item.getCategoryRu()) && !isBlank(entry.getCategoryRu())) {
            item.setCategoryRu(entry.getCategoryRu());
        }
    }

    private boolean hasShortIngredients(MenuItem item) {
        return isTooShort(item.getIngredientsKg(), 40)
                || isTooShort(item.getIngredientsRu(), 40);
    }

    private void syncLegacyFields(MenuItem item) {
        if (isBlank(item.getIngredients()) && !isBlank(item.getIngredientsKg())) {
            item.setIngredients(item.getIngredientsKg());
        }
    }

    private MenuItem copyItem(MenuItem source) {
        MenuItem copy = new MenuItem();
        copy.setId(source.getId());
        copy.setName(source.getName());
        copy.setDescription(source.getDescription());
        copy.setIngredients(source.getIngredients());
        copy.setCategory(source.getCategory());
        copy.setNameKg(source.getNameKg());
        copy.setDescriptionKg(source.getDescriptionKg());
        copy.setIngredientsKg(source.getIngredientsKg());
        copy.setCategoryKg(source.getCategoryKg());
        copy.setNameRu(source.getNameRu());
        copy.setDescriptionRu(source.getDescriptionRu());
        copy.setIngredientsRu(source.getIngredientsRu());
        copy.setCategoryRu(source.getCategoryRu());
        copy.setPrice(source.getPrice());
        copy.setWeight(source.getWeight());
        copy.setSpicyLevel(source.getSpicyLevel());
        copy.setImage(source.getImage());
        copy.setAvailable(source.getAvailable());
        return copy;
    }

    private List<MenuCatalogEntry> loadCatalog(JsonMapper jsonMapper) {
        ClassPathResource resource = new ClassPathResource("menu-catalog.json");
        if (!resource.exists()) {
            return List.of();
        }

        try (InputStream inputStream = resource.getInputStream()) {
            return jsonMapper.readValue(
                    inputStream,
                    new TypeReference<List<MenuCatalogEntry>>() {
                    }
            );
        } catch (IOException exception) {
            return List.of();
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private boolean isTooShort(String value, int minLength) {
        return isBlank(value) || value.trim().length() < minLength;
    }

    private boolean safeEquals(String left, String right) {
        if (left == null) {
            return right == null;
        }
        return left.equals(right);
    }
}
