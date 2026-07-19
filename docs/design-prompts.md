# Дизайн промпттору — AI дизайн куралдары үчүн

Cursor'го дизайнды жибергенде: скрин + кайсы ресторан/панель экенин жаз.

---

## 1. FEMILI — Кардар меню (🍣 Япон/суши)

```
Design a mobile-first food delivery menu page for a Japanese sushi restaurant called "Femili".

Style: Dark elegant Japanese aesthetic. Black background (#0D0D0D), red accents (#E63946), white text. Minimal, premium feel.

Layout:
- Top: Restaurant logo "Femili" with small sushi icon, subtle red underline
- Horizontal scroll category tabs: Роллы | Суши | Запеченные | Напитки | Сеты
- Food cards in 2-column grid:
  - Square food photo (rounded corners 12px)
  - Dish name in white bold
  - Short description in gray (2 lines max)
  - Price in red: "370 сом"
  - Round "+" add button (red)
- Bottom sticky bar: Cart icon + "Корзина: 850 сом (3)" + red "Заказать" button
- Floating cart badge with item count

Typography: Clean sans-serif, modern. Mobile width 390px.
No clutter. High quality food photography placeholders.
Professional delivery app UI like Yandex Eats but dark Japanese theme.
```

---

## 2. AGA-INI — Кардар меню (🥘 Турук/улуттук)

```
Design a mobile-first food delivery menu page for a national cuisine restaurant called "Aga-Ini".

Style: Warm traditional Central Asian aesthetic. Deep burgundy (#6B2737), gold accents (#D4AF37), cream background (#FFF8F0). Elegant, home-cooked feel.

Layout:
- Top: Logo "Aga-Ini" with ornamental border pattern, gold decorative line
- Category tabs with gold underline: Плов | Лагман | Шорпо | Салат | Напитки
- Food cards in single column (wider photos):
  - Large rectangular food photo (full width, rounded 16px)
  - Dish name in burgundy bold
  - Description in brown-gray
  - Price in gold: "350 сом"
  - "В корзину" button (burgundy, rounded)
- Bottom sticky cart bar (cream with gold border)

Typography: Slightly serif headings, warm feel. Mobile 390px.
Traditional but modern. Like a premium halal restaurant app.
```

---

## 3. BURGER MEN — Кардар меню (🍔 Бургер)

```
Design a mobile-first food delivery menu page for a burger restaurant called "Burger Men".

Style: Bold American fast food. Bright red (#FF0000), yellow (#FFC107), white background. Energetic, fun, youthful.

Layout:
- Top: Bold logo "BURGER MEN" in red with burger emoji, yellow stripe below
- Category tabs (pill shape, red when active): Бургеры | Картошка | Напитки | Комбо | Соусы
- Food cards in 2-column grid:
  - Circular or rounded square burger photo
  - Name in bold black uppercase
  - Small description
  - Price in red big font: "450 сом"
  - Yellow "+" circle button
- Bottom: Red sticky bar "🛒 Корзина — 900 сом" with yellow ORDER button

Typography: Bold, chunky sans-serif (like Impact or similar). Mobile 390px.
Fun, appetizing, McDonald's meets modern delivery app vibe.
```

---

## 4. ZHOROLOR SAMSA — Кардар меню (🥟 Самса)

```
Design a mobile-first food delivery menu page for a traditional samsa/bakery called "Zhorolor Samsa".

Style: Kyrgyz traditional modern. Forest green (#2D6A4F), warm white (#FAFAF5), orange accent (#F77F00). Cozy, homemade, national pride.

Layout:
- Top: Logo "Zhorolor" with small орnement (Kyrgyz pattern border), green header
- Category tabs: Самса | Бешбармак | Баursaki | Чай | Таттуу
- Food cards single column:
  - Warm-toned food photo (golden baked goods)
  - Name in green bold
  - "Сveже выпечка" or weight "1 шт — 80 сом"
  - Price in orange
  - Green "Добавить" button with rounded corners
- Bottom cart bar (green)

Typography: Friendly rounded sans-serif. Mobile 390px.
Homemade bakery feel. Instagram-friendly food photos.
Kyrgyz national food delivery app.
```

---

## 5. Чайхана — Кардар меню (🍽 Современный)

```
Design a mobile-first food delivery menu page for a restaurant called "Chaikhana".

Style: Clean contemporary. Navy blue (#1D3557), light gray background (#F1F1F1), teal accent (#2A9D8F). Minimal, professional, upscale casual dining.

Layout:
- Top: Minimal restaurant name in navy, thin teal line separator
- Category tabs (minimal underline style): Основные | Супы | Салаты | Гарниры | Напитки
- Food cards in 2-column grid:
  - Clean square photo with subtle shadow
  - Name in navy medium weight
  - One line description in gray
  - Price in teal: "520 сom"
  - Minimal teal "+" icon button
- Bottom: White sticky bar with navy text, teal CTA button "Оформить заказ"

Typography: Inter or Helvetica style, clean. Mobile 390px.
Modern restaurant app like Wolt or Glovo. Professional and clean.
```

---

## 6. ЗАКАЗ БЕРҮҮ — Бардык ресторандар үчүн бирдей

```
Design a mobile checkout/order page for food delivery (works for any restaurant).

Style: Clean white background, matches parent restaurant accent color for buttons.

Layout - Step by step:
1. Order summary:
   - List of items with photo thumbnail, name, qty, price
   - Total bold at bottom

2. Delivery info form:
   - Address input field (with map pin icon)
   - Phone number input
   - Comment/notes textarea (optional)

3. Payment section:
   - Bank icon + account number in copyable box: "996 XXX XXX XXX"
   - Order code: "#ORD-2847" in highlighted box
   - Amount: "850 сом" big and bold
   - Instruction text: "Переведите сумму и загрузите скрин чека"

4. Receipt upload:
   - Dashed border upload area
   - Camera/gallery icon
   - "Загрузить скрин чека" button

5. Submit: Big accent color button "Отправить заказ"

Mobile 390px. Clean form design. Easy to use.
```

---

## 7. ЗАКАЗ БАРАКЧАСЫ — Статус + код

```
Design a mobile order tracking page for food delivery.

Style: Clean, status-focused. White background, colored status indicators.

Layout:
- Top: Order number "#ORD-2847" and restaurant name
- Status timeline (vertical stepper):
  ○ Заказ отправлен
  ○ Проверка оплаты... (pulsing animation hint)
  ● Принят ✅ (green check)
  ○ Готовится...
  ○ Готов
  ○ Доставляется 🛵
  ○ Доставлен ✅

- When status = "Доставляется":
  BIG highlighted box:
  "Код для курьера: 4829"
  "Скажите этот код курьеру"

- Order details below: items, address, total
- No login, no account — just order link page

Mobile 390px. Clear status progression. User-friendly.
```

---

## 8. АШКАНА ПАНЕЛИ — 5 ресторан үчүн БИРДЕЙ дизайн

```
Design a tablet-friendly kitchen panel dashboard for restaurant staff (same layout for all restaurants, only logo changes).

Style: Dark professional kitchen UI. Dark gray background (#1A1A2E), white text, green for ready, orange for cooking, red for new orders.

Layout:
- Top bar: Restaurant logo placeholder (left) | Current time | "3 активных заказа" (right)
- Main area: Order cards in grid (2-3 columns on tablet):

Each order card:
- Order ID: "#2847" big
- Time: "14:32" 
- Total: "850 сом"
- Items list:
  "2x Филадельфия"
  "1x Калифорния"
- Address: "📍 ул. Ленина 45, кв 12"
- Two big buttons at bottom:
  [🍳 Готовится] (orange)  [✅ Готов] (green)

- New orders appear with red border pulse animation
- Sidebar navigation:
  🔔 Активные заказы
  📋 История заказов
  🍽 Меню управление
  📊 Отчёт

Tablet landscape 1024px. Large touch-friendly buttons.
Kitchen staff use with greasy hands — big buttons, high contrast.
Professional restaurant POS/kitchen display system.
```

---

## 9. МЕНЮ БАШKARUU — Ресторан панели

```
Design a menu management page for restaurant admin panel (tablet/desktop).

Style: Clean admin UI. White background, light gray sidebar, blue accents.

Layout:
- Sidebar: Logo | Меню | Заказы | История | Отчёт
- Main content:
  - Header: "Управление меню" + green "+ Добавить блюдо" button
  - Category filter tabs
  - Table/list of menu items:
    Columns: Photo thumbnail | Name | Category | Price | Status (Active/Inactive) | Edit | Delete icon
  - Example rows with food photos

- "Add dish" modal/form:
  - Photo upload area (drag & drop)
  - Name input
  - Description textarea
  - Price input (number)
  - Category dropdown
  - Active toggle switch
  - Save button

Desktop 1280px. Clean admin dashboard like Shopify or Stripe dashboard.
Simple for non-technical restaurant staff.
```

---

## 10. АДМИН ПАНЕЛИ — Senin (программист)

```
Design an admin dashboard for a multi-restaurant food delivery platform owner.

Style: Professional dark admin dashboard. Dark sidebar (#0F172A), white content area, colorful status badges.

Layout:
- Dark sidebar navigation:
  📊 Dashboard
  🏪 Рестораны (5)
  📋 Все заказы
  🛵 Курьеры
  💰 Финансы
  📈 Отчёты
  ⚙️ Настройки

- Dashboard main:
  - Stats cards row: "Сегодня: 23 заказа | 19,400 сом | 3 курьера активны"
  - Live orders table:
    Columns: ID | Ресторан | Сумма | Статус | Скрин | Действие
    Status badges: color coded
    Action buttons: [✅ Принять] [❌ Отклонить] for pending receipts
  
  - Courier status section:
    "Курьер Аза 🟢 Свободен"
    "Курьер Макс 🔴 Доставляет #2847"
    "Курьер Бека 🟢 Свободен"

  - Restaurant filter dropdown

Desktop 1440px. Professional SaaS admin panel.
Like Stripe dashboard or Uber Eats merchant admin.
Data-dense but clean. Real-time order monitoring feel.
```

---

## Кайсы AI колдонуу

| Курал | Эмне үчүн |
|---|---|
| **v0.dev** | React компонентter — код менен birge |
| **Figma AI** | Mockup, wireframe |
| **Canva** | Меню карточkalar, poster |
| **Midjourney** | Тamak surötтөр (фон) |
| **Galileo AI** | UI mockup |

**Сунуш:** **v0.dev** — скрин + код birge чыгат, мага жиберүү oson.

---

## Cursor'го жибергенде

```
1. Скрин jibер
2. Кайсы ресторан/панель экенин жаз
3. Мен ошого карап код yazam
```

Мисал: "Бул Femili менюsu — v0'ден aldym, React код керек"
