package kg.restaurant.order.controller;

import kg.restaurant.order.model.CustomerOrder;
import kg.restaurant.order.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reports")
@CrossOrigin("*")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/today")
    public Map<String, Object> todayReport(@RequestParam(required = false) Long restaurantId) {
        return reportService.buildTodayReport(restaurantId);
    }

    @GetMapping("/daily")
    public Map<String, Object> dailyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long restaurantId
    ) {
        return reportService.buildDailyReport(date, restaurantId);
    }

    @GetMapping("/evening")
    public Map<String, Object> eveningReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long restaurantId
    ) {
        LocalDate d = date != null ? date : LocalDate.now();
        return reportService.buildEveningReport(d, restaurantId);
    }

    @GetMapping("/weekly")
    public Map<String, Object> weeklyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long restaurantId
    ) {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        return reportService.buildWeeklyReport(end, restaurantId);
    }

    @GetMapping("/monthly")
    public Map<String, Object> monthlyReport(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Long restaurantId
    ) {
        return reportService.buildMonthlyReport(year, month, restaurantId);
    }

    @GetMapping("/yearly")
    public Map<String, Object> yearlyReport(
            @RequestParam int year,
            @RequestParam(required = false) Long restaurantId
    ) {
        return reportService.buildYearlyReport(year, restaurantId);
    }

    @GetMapping("/range")
    public Map<String, Object> rangeReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long restaurantId
    ) {
        return reportService.buildRangeReport(from, to, restaurantId);
    }

    /** preset: today | yesterday | evening | week | month | lastmonth | year | custom */
    @GetMapping("/summary")
    public Map<String, Object> summaryReport(
            @RequestParam(defaultValue = "today") String preset,
            @RequestParam(required = false) Long restaurantId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.buildByPreset(preset, restaurantId, from, to);
    }

    @GetMapping("/years")
    public List<Integer> reportYears(@RequestParam(required = false) Long restaurantId) {
        return reportService.getReportYears(restaurantId);
    }

    @GetMapping("/daily-orders")
    public List<CustomerOrder> dailyOrders(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long restaurantId
    ) {
        return reportService.findOrdersForDate(date, restaurantId);
    }
}
