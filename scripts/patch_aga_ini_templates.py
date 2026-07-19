import re
from pathlib import Path

TPL_DIR = Path(__file__).resolve().parents[1] / "src/main/resources/templates"

HEAD_BLOCK = """<!DOCTYPE html>
<html lang="ky" xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title th:text="${restaurantName}">АГА-ИНИ</title>
    <link rel="stylesheet" th:href="${customerCss}" href="/aga-ini-customer.css">
    <script th:inline="javascript">
        window.RESTAURANT = {
            id: /*[[${restaurantId}]]*/ 1,
            slug: /*[[${restaurantSlug}]]*/ 'aga-ini',
            name: /*[[${restaurantName}]]*/ 'АГА-ИНИ',
            base: /*[[${restaurantBase}]]*/ '/aga-ini'
        };
    </script>
    <script src="/restaurant-context.js"></script>
</head>"""


def patch_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"<!DOCTYPE html>.*?</head>", HEAD_BLOCK, text, count=1, flags=re.S)

    replacements = [
        ("localStorage.getItem('cart')", "localStorage.getItem(cartStorageKey())"),
        ('localStorage.getItem("cart")', "localStorage.getItem(cartStorageKey())"),
        ("localStorage.setItem('cart',", "localStorage.setItem(cartStorageKey(),"),
        ('localStorage.setItem("cart",', "localStorage.setItem(cartStorageKey(),"),
        ("localStorage.removeItem('cart')", "localStorage.removeItem(cartStorageKey())"),
        ('localStorage.removeItem("cart")', "localStorage.removeItem(cartStorageKey())"),
        ('href="/cart"', 'th:href="${restaurantBase + \'/cart\'}" href="/aga-ini/cart"'),
        ('href="/"', 'th:href="${restaurantBase}" href="/aga-ini"'),
        ("location.href='/cart'", "location.href=rUrl('/cart')"),
        ("location.href='/receipt'", "location.href=rUrl('/receipt')"),
        ("location.href='/'", "location.href=rUrl('/')"),
        ("fetch('/menu')", "fetch('/menu?restaurantId=' + encodeURIComponent(restaurantId))"),
        ('fetch("/menu")', "fetch('/menu?restaurantId=' + encodeURIComponent(restaurantId))"),
        ('src="/logo.jpg"', 'th:src="${restaurantLogo != null ? restaurantLogo : \'/restaurant/aga-ini/logo.png\'}" src="/restaurant/aga-ini/logo.png"'),
        ("<h1>ага-ини</h1>", '<h1 th:text="${restaurantName}">АГА-ИНИ</h1>'),
    ]
    for old, new in replacements:
        text = text.replace(old, new)

    path.write_text(text, encoding="utf-8")
    print("patched", path.name)


if __name__ == "__main__":
    for name in ["aga-ini-index.html", "aga-ini-cart.html", "aga-ini-receipt.html"]:
        patch_file(TPL_DIR / name)
