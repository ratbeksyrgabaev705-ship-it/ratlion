package kg.restaurant.order.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Эски маалыматтар бузулбашы үчүн азырынча калат
    private String name;
    private String description;
    private String ingredients;
    private String category;

    // Кыргызча
    private String nameKg;
    private String descriptionKg;
    private String ingredientsKg;
    private String categoryKg;

    // Орусча
    private String nameRu;
    private String descriptionRu;
    private String ingredientsRu;
    private String categoryRu;

    private Double price;

    private Integer weight;

    private Integer spicyLevel;

    private String image;

    private Boolean available = true;

    private Long restaurantId;

    public MenuItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIngredients() {
        return ingredients;
    }

    public void setIngredients(String ingredients) {
        this.ingredients = ingredients;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getNameKg() {
        return nameKg;
    }

    public void setNameKg(String nameKg) {
        this.nameKg = nameKg;
    }

    public String getDescriptionKg() {
        return descriptionKg;
    }

    public void setDescriptionKg(String descriptionKg) {
        this.descriptionKg = descriptionKg;
    }

    public String getIngredientsKg() {
        return ingredientsKg;
    }

    public void setIngredientsKg(String ingredientsKg) {
        this.ingredientsKg = ingredientsKg;
    }

    public String getCategoryKg() {
        return categoryKg;
    }

    public void setCategoryKg(String categoryKg) {
        this.categoryKg = categoryKg;
    }

    public String getNameRu() {
        return nameRu;
    }

    public void setNameRu(String nameRu) {
        this.nameRu = nameRu;
    }

    public String getDescriptionRu() {
        return descriptionRu;
    }

    public void setDescriptionRu(String descriptionRu) {
        this.descriptionRu = descriptionRu;
    }

    public String getIngredientsRu() {
        return ingredientsRu;
    }

    public void setIngredientsRu(String ingredientsRu) {
        this.ingredientsRu = ingredientsRu;
    }

    public String getCategoryRu() {
        return categoryRu;
    }

    public void setCategoryRu(String categoryRu) {
        this.categoryRu = categoryRu;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Integer getWeight() {
        return weight;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    public Integer getSpicyLevel() {
        return spicyLevel;
    }

    public void setSpicyLevel(Integer spicyLevel) {
        this.spicyLevel = spicyLevel;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }

    public Long getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(Long restaurantId) {
        this.restaurantId = restaurantId;
    }
}