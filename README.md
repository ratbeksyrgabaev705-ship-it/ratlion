# RATLION

Базар-Коргон шаары үчүн тамак жеткирүү платформасы — 5 ресторан, бир доставка сервиси.

## Ресторандар

| Ресторан | Кардар шилтемеси | Кухня панели |
|----------|------------------|--------------|
| АГА-ИНИ | `/aga-ini` | `/kitchen/aga-ini` |
| ОРДО | `/ordo-cafe` (же `/ordo`) | `/kitchen/ordo-cafe` |
| BURGERMAN | `/burger-men` (же `/burgerman`) | `/kitchen/burger-men` |
| FEMILY | `/family` (же `/femily`) | `/kitchen/family` |
| ЖОРОЛОР САМСАСЫ | `/zhorolor` | `/kitchen/zhorolor` |

## Панелдер

- `/` — ресторан каталогу
- `/ratlion` — доставка сервиси (чек текшерүү, кабыл алуу)
- `/courier` — курьер панели

## Заказ агымы

1. Кардар менюдан тандап, чек жиберет
2. RATLION (`/ratlion`) — менеджер чекти текшерип кабыл алат
3. Кабыл алынган заказ ошол ресторандын кухня панeline түшөт (ОД 1, даярдоо, даяр, курьерге)

## Локалды иштетүү

```bash
./mvnw spring-boot:run
```

Сайт: http://localhost:8080

## Интернетке чыгаруу (акысыз — Render.com)

Проектте `Dockerfile` жана `render.yaml` даяр. Render акысыз web + PostgreSQL берет.

### 1. GitHub'га жүктөө

GitHub'да жаңы репозиторий ачыңыз (мисалы `ratlion`), андан кийин:

```bash
cd ratlion
git add .
git commit -m "Deploy RATLION platform"
git branch -M main
git remote add origin https://github.com/SIZIN_USERNAME/ratlion.git
git push -u origin main
```

### 2. Render'де орнотуу

1. [render.com](https://render.com) — аккаунт ачыңыз (GitHub менен кирүү оңой)
2. **New +** → **Blueprint**
3. GitHub репозиторийиңизди тандаңыз
4. `render.yaml` автоматтык көрүнөт → **Apply**
5. 5–10 мүнөт күтүңүз (Docker build + PostgreSQL)

Даяр URL: `https://ratlion.onrender.com` (же Render берген домен)

### 3. Текшерүү шилтемелери (production)

| Бет | URL |
|-----|-----|
| Башкы | `https://SIZIN-DOMEN/` |
| RATLION (чек) | `https://SIZIN-DOMEN/ratlion` |
| BURGERMAN | `https://SIZIN-DOMEN/burger-men` |
| ЖОРОЛОР | `https://SIZIN-DOMEN/zhorolor` |
| Кухня | `https://SIZIN-DOMEN/kitchen/burger-men` |
| Курьер | `https://SIZIN-DOMEN/courier` |

### Telegram (милдеттүү эмес)

Render → **ratlion** сервис → **Environment**:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_MANAGER_CHAT_ID`

### Эскертүүлөр

- **Акысыз план** 15 мүнөт иштебегенде «uykutulat» — биринчи ачуу 30–60 секунд алат
- **PostgreSQL** маалымат сакталат (H2 эмес)
- **Чек скриндери** контейнер ичинде — кайра deploy кылсаңыз жоголушу мумкун (тест үчүн жетиштүү)

### Альтернатива: Railway / Fly.io

Dockerfile бар — ошол платформаларга да `docker build` менен орнотсо болот. Render эң оңой, анткени `render.yaml` даяр.
