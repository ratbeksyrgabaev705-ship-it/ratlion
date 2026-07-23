package kg.restaurant.order.service;

import kg.restaurant.order.model.MenuItem;

import java.util.Locale;

final class MenuContentGenerator {

    private MenuContentGenerator() {
    }

    static boolean needsIngredients(MenuItem item) {
        return isTooShort(item.getIngredientsKg(), 40)
                && isTooShort(item.getIngredientsRu(), 40)
                && isTooShort(item.getIngredients(), 40);
    }

    static void applyGeneratedIngredients(MenuItem item) {
        String nameKg = firstNonBlank(item.getNameKg(), item.getName(), item.getNameRu(), "Тамак");
        String nameRu = firstNonBlank(item.getNameRu(), item.getName(), item.getNameKg(), "Блюдо");
        String categoryKg = firstNonBlank(item.getCategoryKg(), item.getCategory(), "Улуттук тамактар");
        String categoryRu = firstNonBlank(item.getCategoryRu(), item.getCategory(), "Национальные блюда");

        if (isTooShort(item.getIngredientsKg(), 40)) {
            item.setIngredientsKg(generateIngredientsKg(nameKg, categoryKg));
            item.setIngredients(item.getIngredientsKg());
        }
        if (isTooShort(item.getIngredientsRu(), 40)) {
            item.setIngredientsRu(generateIngredientsRu(nameRu, categoryRu));
        }
    }

    private static String generateIngredientsKg(String name, String category) {
        String key = normalize(category + " " + name);
        if (key.contains("лагман") || key.contains("ganfan") || key.contains("ганфан")) {
            return "Колго чоюлган кесме, жаңы уй эти, пияз, сабиз, болгар калемпири, "
                    + "сарымсак, томат пастасы, соя соусу, күнжүт майы, жашыл пияз, уйгур татымалдары.";
        }
        if (key.contains("плов") || key.contains("күрүч")) {
            return "Жашыл күрүч, уй эти, сабиз, пияз, сарымсак, зира, барбарис, "
                    + "кызыл калемпир, өсүмдүк майы, туз, атайын специялар.";
        }
        if (key.contains("самса")) {
            return "Жумшак камыр, начинка, пияз, зира, кара мурч, туз, "
                    + "өсүмдүк майы, жумуртка, кунжут.";
        }
        if (key.contains("шорп")) {
            return "Уй эти, суу, картошка, сабиз, пияз, сарымсак, кара мурч, "
                    + "лавр жапasy, жашыл пияз, денгиз такы, туз.";
        }
        if (key.contains("салат")) {
            return "Помидор, жашыл салат, бадырак, пияз, майонез, туз, кара мурч, лимон.";
        }
        if (key.contains("ичим") || key.contains("чай") || key.contains("айран")) {
            return "Тазa суусундуктар, свежo даярдалган негизги компоненттер, туз же кand.";
        }
        return "Свежo тандалган негизги продукттар, жашылчалар, эт, татымалдар, "
                + "май, туз жана атайын рецепт боюнча кошумча ингредиенттер.";
    }

    private static String generateIngredientsRu(String name, String category) {
        String key = normalize(category + " " + name);
        if (key.contains("лагман") || key.contains("ganfan") || key.contains("ганфан")) {
            return "Лапша ручной работы, свежая говядина, лук, морковь, болгарский перец, "
                    + "чеснок, томатная паста, соевый соус, кунжутное масло, зелёный лук, уйгурские специи.";
        }
        if (key.contains("плов") || key.contains("рис")) {
            return "Рис, говядина, морковь, лук, чеснок, зира, барбарис, "
                    + "красный перец, растительное масло, соль, фирменные специи.";
        }
        if (key.contains("самса")) {
            return "Мягкое тесто, начинка, лук, зира, чёрный перец, соль, "
                    + "растительное масло, яйцо, кунжут.";
        }
        if (key.contains("шорп")) {
            return "Говядина, вода, картофель, морковь, лук, чеснок, чёрный перец, "
                    + "лавровый лист, зелёный лук, укроп, соль.";
        }
        if (key.contains("салат")) {
            return "Помидоры, зелёный салат, укроп, лук, майонез, соль, чёрный перец, лимон.";
        }
        if (key.contains("напит") || key.contains("чай") || key.contains("айран")) {
            return "Свежие основные ингредиенты, чистая вода, сахар или соль по рецепту.";
        }
        return "Свежие основные продукты, овощи, мясо, специи, масло, соль "
                + "и дополнительные ингредиенты по фирменному рецепту.";
    }

    static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT)
                .replace('ё', 'е')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static boolean isTooShort(String value, int minLength) {
        return isBlank(value) || value.trim().length() < minLength;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value.trim();
            }
        }
        return "";
    }
}
