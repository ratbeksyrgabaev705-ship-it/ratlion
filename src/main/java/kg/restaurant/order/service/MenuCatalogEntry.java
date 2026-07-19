package kg.restaurant.order.service;

import java.util.List;

public class MenuCatalogEntry {

    private List<String> matchNames;
    private String nameKg;
    private String nameRu;
    private String categoryKg;
    private String categoryRu;
    private String ingredientsKg;
    private String ingredientsRu;
    private String descriptionKg;
    private String descriptionRu;

    public List<String> getMatchNames() {
        return matchNames;
    }

    public void setMatchNames(List<String> matchNames) {
        this.matchNames = matchNames;
    }

    public String getNameKg() {
        return nameKg;
    }

    public void setNameKg(String nameKg) {
        this.nameKg = nameKg;
    }

    public String getNameRu() {
        return nameRu;
    }

    public void setNameRu(String nameRu) {
        this.nameRu = nameRu;
    }

    public String getCategoryKg() {
        return categoryKg;
    }

    public void setCategoryKg(String categoryKg) {
        this.categoryKg = categoryKg;
    }

    public String getCategoryRu() {
        return categoryRu;
    }

    public void setCategoryRu(String categoryRu) {
        this.categoryRu = categoryRu;
    }

    public String getIngredientsKg() {
        return ingredientsKg;
    }

    public void setIngredientsKg(String ingredientsKg) {
        this.ingredientsKg = ingredientsKg;
    }

    public String getIngredientsRu() {
        return ingredientsRu;
    }

    public void setIngredientsRu(String ingredientsRu) {
        this.ingredientsRu = ingredientsRu;
    }

    public String getDescriptionKg() {
        return descriptionKg;
    }

    public void setDescriptionKg(String descriptionKg) {
        this.descriptionKg = descriptionKg;
    }

    public String getDescriptionRu() {
        return descriptionRu;
    }

    public void setDescriptionRu(String descriptionRu) {
        this.descriptionRu = descriptionRu;
    }
}
