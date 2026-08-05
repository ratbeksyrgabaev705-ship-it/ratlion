package kg.restaurant.order.controller;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private static final String NOMINATIM_REVERSE =
            "https://nominatim.openstreetmap.org/reverse";
    private static final String NOMINATIM_SEARCH =
            "https://nominatim.openstreetmap.org/search";

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/reverse")
    public ResponseEntity<Map<String, Object>> reverseGeocode(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "ru") String lang
    ) {
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return ResponseEntity.badRequest().build();
        }

        String url = UriComponentsBuilder.fromUriString(NOMINATIM_REVERSE)
                .queryParam("lat", lat)
                .queryParam("lon", lon)
                .queryParam("format", "json")
                .queryParam("accept-language", lang)
                .queryParam("zoom", 18)
                .toUriString();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> raw = nominatimGet(url, Map.class);
            if (raw == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(toLocationResult(lat, lon, raw));
        } catch (Exception e) {
            return ResponseEntity.ok(fallbackResult(lat, lon));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "ru") String lang
    ) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 2) {
            return ResponseEntity.ok(List.of());
        }

        String searchQuery = query;
        if (!searchQuery.toLowerCase().contains("бишкек")
                && !searchQuery.toLowerCase().contains("bishkek")) {
            searchQuery = searchQuery + ", Бишкек";
        }

        String url = UriComponentsBuilder.fromUriString(NOMINATIM_SEARCH)
                .queryParam("q", searchQuery)
                .queryParam("format", "json")
                .queryParam("addressdetails", 1)
                .queryParam("limit", 6)
                .queryParam("countrycodes", "kg")
                .queryParam("accept-language", lang)
                .toUriString();

        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> raw = nominatimGet(url, List.class);
            if (raw == null || raw.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            List<Map<String, Object>> results = new ArrayList<>();
            for (Map<String, Object> item : raw) {
                double lat = parseDouble(item.get("lat"));
                double lon = parseDouble(item.get("lon"));
                if (lat == 0 && lon == 0) continue;

                String formatted = formatAddress(item);
                String label = str(item.get("display_name"));
                if (label.isBlank()) label = formatted;

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("lat", lat);
                row.put("lng", lon);
                row.put("address", formatted);
                row.put("label", shortenLabel(label));
                results.add(row);
            }
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    private Map<String, Object> toLocationResult(double lat, double lon, Map<String, Object> raw) {
        String formatted = formatAddress(raw);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("lat", lat);
        result.put("lng", lon);
        result.put("address", formatted);
        result.put("fullAddress", raw.getOrDefault("display_name", formatted));
        return result;
    }

    private Map<String, Object> fallbackResult(double lat, double lon) {
        Map<String, Object> fallback = new LinkedHashMap<>();
        fallback.put("lat", lat);
        fallback.put("lng", lon);
        fallback.put("address", String.format("%.5f, %.5f", lat, lon));
        fallback.put("fullAddress", fallback.get("address"));
        return fallback;
    }

    private <T> T nominatimGet(String url, Class<T> type) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "RATLION-Delivery/1.0 (contact@ratlion.kg)");
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        return restTemplate.exchange(url, HttpMethod.GET, entity, type).getBody();
    }

    @SuppressWarnings("unchecked")
    private String formatAddress(Map<String, Object> raw) {
        Object addrObj = raw.get("address");
        if (addrObj instanceof Map<?, ?> addr) {
            String road = str(addr.get("road"));
            String house = str(addr.get("house_number"));
            String suburb = str(addr.get("suburb"));
            String neighbourhood = str(addr.get("neighbourhood"));
            String city = firstNonBlank(
                    str(addr.get("city")),
                    str(addr.get("town")),
                    str(addr.get("village")),
                    "Бишкек"
            );

            StringBuilder sb = new StringBuilder();
            if (!road.isBlank()) {
                sb.append(road);
                if (!house.isBlank()) sb.append(", ").append(house);
            } else if (!suburb.isBlank()) {
                sb.append(suburb);
            } else if (!neighbourhood.isBlank()) {
                sb.append(neighbourhood);
            }

            if (sb.isEmpty()) {
                return shortenLabel(str(raw.get("display_name")));
            }

            if (!city.isBlank() && !sb.toString().toLowerCase().contains(city.toLowerCase())) {
                sb.append(", ").append(city);
            }
            return sb.toString();
        }
        return shortenLabel(str(raw.get("display_name")));
    }

    private String shortenLabel(String label) {
        if (label.isBlank()) return label;
        int idx = label.indexOf(", Кыргызстан");
        if (idx > 0) return label.substring(0, idx);
        idx = label.indexOf(", Kyrgyzstan");
        if (idx > 0) return label.substring(0, idx);
        return label;
    }

    private static double parseDouble(Object v) {
        if (v == null) return 0;
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String str(Object v) {
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }
}
