package kg.restaurant.order.service;

import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.model.Restaurant;
import kg.restaurant.order.repository.CustomerOrderRepository;
import kg.restaurant.order.repository.RestaurantRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");
    private static final LocalTime EVENING_START = LocalTime.of(17, 0);
    private static final LocalTime EVENING_END = LocalTime.of(23, 59, 59);

    private final CustomerOrderRepository repository;
    private final RestaurantRepository restaurantRepository;

    public ReportService(
            CustomerOrderRepository repository,
            RestaurantRepository restaurantRepository
    ) {
        this.repository = repository;
        this.restaurantRepository = restaurantRepository;
    }

    public Map<String, Object> buildTodayReport(Long restaurantId) {
        return buildDailyReport(LocalDate.now(BISHKEK), restaurantId);
    }

    public Map<String, Object> buildDailyReport(LocalDate date, Long restaurantId) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        List<CustomerOrder> delivered = findDelivered(start, end, restaurantId);
        return buildFullReport(delivered, restaurantId, start, end, "daily", date.toString());
    }

    public Map<String, Object> buildEveningReport(LocalDate date, Long restaurantId) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();
        List<CustomerOrder> allDay = findDelivered(dayStart, dayEnd, restaurantId);
        List<CustomerOrder> evening = allDay.stream()
                .filter(o -> {
                    LocalDateTime t = effectiveDeliveredAt(o);
                    LocalTime time = t.toLocalTime();
                    return !time.isBefore(EVENING_START) && !time.isAfter(EVENING_END);
                })
                .collect(Collectors.toList());
        LocalDateTime eveStart = date.atTime(EVENING_START);
        LocalDateTime eveEnd = date.atTime(EVENING_END).plusSeconds(1);
        return buildFullReport(evening, restaurantId, eveStart, eveEnd, "evening", date + " 17:00–23:59");
    }

    public Map<String, Object> buildWeeklyReport(LocalDate weekEnd, Long restaurantId) {
        LocalDate weekStart = weekEnd.minusDays(6);
        return buildRangeReport(weekStart, weekEnd, restaurantId, "weekly");
    }

    public Map<String, Object> buildMonthlyReport(int year, int month, Long restaurantId) {
        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        Map<String, Object> report = buildRangeReport(first, last, restaurantId, "monthly");
        report.put("year", year);
        report.put("month", month);
        report.put("monthName", Month.of(month).getDisplayName(TextStyle.FULL_STANDALONE, new Locale("ru")));

        List<Map<String, Object>> dailyChart = new ArrayList<>();
        for (LocalDate d = first; !d.isAfter(last); d = d.plusDays(1)) {
            LocalDateTime s = d.atStartOfDay();
            LocalDateTime e = d.plusDays(1).atStartOfDay();
            List<CustomerOrder> dayOrders = findDelivered(s, e, restaurantId);
            double rev = sumRevenue(dayOrders);
            dailyChart.add(Map.of(
                    "date", d.toString(),
                    "totalOrders", dayOrders.size(),
                    "totalRevenue", rev
            ));
        }
        report.put("dailyChart", dailyChart);
        return report;
    }

    public Map<String, Object> buildYearlyReport(int year, Long restaurantId) {
        LocalDate first = LocalDate.of(year, 1, 1);
        LocalDate last = LocalDate.of(year, 12, 31);
        Map<String, Object> report = buildRangeReport(first, last, restaurantId, "yearly");
        report.put("year", year);

        List<Map<String, Object>> monthlyChart = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            LocalDate mFirst = LocalDate.of(year, m, 1);
            LocalDate mLast = mFirst.withDayOfMonth(mFirst.lengthOfMonth());
            List<CustomerOrder> monthOrders = findDelivered(mFirst.atStartOfDay(), mLast.plusDays(1).atStartOfDay(), restaurantId);
            monthlyChart.add(Map.of(
                    "month", m,
                    "monthName", Month.of(m).getDisplayName(TextStyle.SHORT, new Locale("ru")),
                    "totalOrders", monthOrders.size(),
                    "totalRevenue", sumRevenue(monthOrders)
            ));
        }
        report.put("monthlyChart", monthlyChart);
        return report;
    }

    public Map<String, Object> buildRangeReport(LocalDate from, LocalDate to, Long restaurantId) {
        return buildRangeReport(from, to, restaurantId, "range");
    }

    public Map<String, Object> buildByPreset(String preset, Long restaurantId, LocalDate customFrom, LocalDate customTo) {
        LocalDate today = LocalDate.now(BISHKEK);
        return switch (preset == null ? "today" : preset.toLowerCase(Locale.ROOT)) {
            case "yesterday" -> buildDailyReport(today.minusDays(1), restaurantId);
            case "evening" -> buildEveningReport(today, restaurantId);
            case "week", "last7days" -> buildWeeklyReport(today, restaurantId);
            case "month", "thismonth" -> buildMonthlyReport(today.getYear(), today.getMonthValue(), restaurantId);
            case "lastmonth" -> {
                LocalDate lm = today.minusMonths(1);
                yield buildMonthlyReport(lm.getYear(), lm.getMonthValue(), restaurantId);
            }
            case "year", "thisyear" -> buildYearlyReport(today.getYear(), restaurantId);
            case "custom" -> buildRangeReport(customFrom, customTo, restaurantId);
            default -> buildDailyReport(today, restaurantId);
        };
    }

    public List<Integer> getReportYears(Long restaurantId) {
        List<CustomerOrder> orders = restaurantId != null
                ? repository.findByRestaurantIdAndOrderStatusOrderByCreatedAtDesc(restaurantId, "DELIVERED")
                : repository.findByOrderStatusOrderByCreatedAtDesc("DELIVERED");
        Set<Integer> years = new TreeSet<>(Comparator.reverseOrder());
        for (CustomerOrder o : orders) {
            years.add(effectiveDeliveredAt(o).getYear());
        }
        if (years.isEmpty()) {
            years.add(LocalDate.now(BISHKEK).getYear());
        }
        return new ArrayList<>(years);
    }

    public List<CustomerOrder> findOrdersForDate(LocalDate date, Long restaurantId) {
        return findDelivered(date.atStartOfDay(), date.plusDays(1).atStartOfDay(), restaurantId);
    }

    private Map<String, Object> buildRangeReport(LocalDate from, LocalDate to, Long restaurantId, String type) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<CustomerOrder> delivered = findDelivered(start, end, restaurantId);
        return buildFullReport(delivered, restaurantId, start, end, type, from + " — " + to);
    }

    private List<CustomerOrder> findDelivered(LocalDateTime start, LocalDateTime end, Long restaurantId) {
        return repository.findDeliveredForReport(restaurantId, start, end);
    }

    private Map<String, Object> buildFullReport(
            List<CustomerOrder> delivered,
            Long restaurantId,
            LocalDateTime rangeStart,
            LocalDateTime rangeEnd,
            String reportType,
            String dateLabel
    ) {
        int totalQuantity = 0;
        double totalRevenue = 0;
        Map<String, Integer> soldItems = new LinkedHashMap<>();
        Map<String, Integer> customerOrders = new LinkedHashMap<>();

        for (CustomerOrder order : delivered) {
            totalQuantity += order.getQuantity() == null ? 0 : order.getQuantity();
            totalRevenue += order.getTotalPrice() == null ? 0 : order.getTotalPrice();
            addSoldItems(soldItems, order.getItemName(), order.getQuantity());
            String customerKey = (order.getPhone() != null && !order.getPhone().isBlank())
                    ? order.getPhone() : order.getCustomerName();
            if (customerKey != null && !customerKey.isBlank()) {
                customerOrders.merge(customerKey, 1, Integer::sum);
            }
        }

        long cancelledCount = countCancelled(rangeStart, rangeEnd, restaurantId);
        List<Map<String, Object>> topFoods = soldItems.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(15)
                .map(e -> Map.<String, Object>of("name", e.getKey(), "quantity", e.getValue()))
                .collect(Collectors.toList());

        List<Map<String, Object>> topCustomers = customerOrders.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(15)
                .map(e -> Map.<String, Object>of("customer", e.getKey(), "orders", e.getValue()))
                .collect(Collectors.toList());

        String restaurantName = resolveRestaurantName(restaurantId);

        Map<String, Object> report = new HashMap<>();
        report.put("reportType", reportType);
        report.put("date", dateLabel);
        report.put("restaurantId", restaurantId);
        report.put("restaurantName", restaurantName);
        report.put("completedOrders", delivered.size());
        report.put("totalOrders", delivered.size());
        report.put("cancelledOrders", cancelledCount);
        report.put("totalQuantity", totalQuantity);
        report.put("totalRevenue", totalRevenue);
        report.put("averageOrderAmount", delivered.isEmpty() ? 0 : totalRevenue / delivered.size());
        report.put("averageOrderValue", delivered.isEmpty() ? 0 : totalRevenue / delivered.size());
        report.put("soldItems", soldItems);
        report.put("topFoods", topFoods);
        report.put("topCustomers", topCustomers);
        report.put("customers", customerOrders.size());
        report.put("orders", delivered);
        report.put("permanent", true);
        report.put("source", "DELIVERED");
        report.put("rangeStart", rangeStart.toString());
        report.put("rangeEnd", rangeEnd.toString());
        return report;
    }

    private long countCancelled(LocalDateTime start, LocalDateTime end, Long restaurantId) {
        if (restaurantId != null) {
            return repository.countByRestaurantIdAndOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                    restaurantId, "CANCELLED", start, end);
        }
        return repository.countByOrderStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                "CANCELLED", start, end);
    }

    private String resolveRestaurantName(Long restaurantId) {
        if (restaurantId == null) {
            return "Бардык ресторандар";
        }
        return restaurantRepository.findById(restaurantId)
                .map(Restaurant::getName)
                .orElse("Ресторан");
    }

    private LocalDateTime effectiveDeliveredAt(CustomerOrder order) {
        if (order.getDeliveredAt() != null) {
            return order.getDeliveredAt();
        }
        return order.getCreatedAt();
    }

    private double sumRevenue(List<CustomerOrder> orders) {
        return orders.stream()
                .mapToDouble(o -> o.getTotalPrice() == null ? 0 : o.getTotalPrice())
                .sum();
    }

    private void addSoldItems(Map<String, Integer> soldItems, String itemName, Integer quantity) {
        if (itemName == null || itemName.isBlank()) {
            return;
        }
        for (String part : itemName.split(",")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            String name = trimmed;
            int itemQuantity = quantity == null ? 1 : quantity;
            int xIndex = trimmed.toLowerCase().lastIndexOf(" x");
            if (xIndex > 0) {
                name = trimmed.substring(0, xIndex).trim();
                try {
                    itemQuantity = Integer.parseInt(trimmed.substring(xIndex + 2).trim());
                } catch (NumberFormatException ignored) {
                    itemQuantity = quantity == null ? 1 : quantity;
                }
            }
            soldItems.merge(name, itemQuantity, Integer::sum);
        }
    }
}
