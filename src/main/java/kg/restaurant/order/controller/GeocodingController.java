package kg.restaurant.order.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private static final String NOMINATIM_REVERSE =
            "https://nominatim.openstreetmap.org/reverse";

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

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("User-Agent", "RATLION-Delivery/1.0 (contact@ratlion.kg)");
        org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> raw = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    Map.class
            ).getBody();

            if (raw == null) {
                return ResponseEntity.notFound().build();
            }

            String formatted = formatAddress(raw);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("lat", lat);
            result.put("lng", lon);
            result.put("address", formatted);
            result.put("fullAddress", raw.getOrDefault("display_name", formatted));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("lat", lat);
            fallback.put("lng", lon);
            fallback.put("address", String.format("%.5f, %.5f", lat, lon));
            fallback.put("fullAddress", fallback.get("address"));
            return ResponseEntity.ok(fallback);
        }
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
                return str(raw.get("display_name"));
            }

            if (!city.isBlank() && !sb.toString().toLowerCase().contains(city.toLowerCase())) {
                sb.append(", ").append(city);
            }
            return sb.toString();
        }
        return str(raw.get("display_name"));
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
