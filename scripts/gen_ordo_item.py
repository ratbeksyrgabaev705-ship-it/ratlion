#!/usr/bin/env python3
from pathlib import Path

TPL = Path(__file__).resolve().parents[1] / "src" / "main" / "resources" / "templates"
src = (TPL / "item.html").read_text(encoding="utf-8")

out = src.replace(
    'th:href="${customerCss}" href="/default-customer.css"',
    'th:href="${customerCss}" href="/ordo-cafe-customer.css"',
)
out = out.replace("--item-gold: #d99000;", "--item-gold: #c9a227;")
out = out.replace("url('/hero-bg.png')", "url('/restaurant/ordo-cafe/hero-bg.jpg')")
out = out.replace(
    '<img src="/logo.png" th:alt="${restaurantName}" alt="">',
    '<img th:src="${restaurantLogo != null && !#strings.isEmpty(restaurantLogo) ? restaurantLogo : \'/restaurant/ordo-cafe/logo.png\'}" '
    'src="/restaurant/ordo-cafe/logo.png" th:alt="${restaurantName}" alt="">',
)
out = out.replace(
    "slug: /*[[${restaurantSlug}]]*/ '',",
    "slug: /*[[${restaurantSlug}]]*/ 'ordo-cafe',",
)
out = out.replace(
    "name: /*[[${restaurantName}]]*/ '',",
    "name: /*[[${restaurantName}]]*/ 'ОРДО КАФЕ',",
)
out = out.replace(
    "base: /*[[${restaurantBase}]]*/ '/'",
    "base: /*[[${restaurantBase}]]*/ '/ordo-cafe'",
)
out = out.replace("location.href = '/';", "location.href = rUrl('/');")
out = out.replace(
    "background: var(--item-gold);",
    "background: linear-gradient(135deg, #c9a227, #9a7b1a);",
)

(TPL / "ordo-cafe-item.html").write_text(out, encoding="utf-8")
print("Generated ordo-cafe-item.html")
