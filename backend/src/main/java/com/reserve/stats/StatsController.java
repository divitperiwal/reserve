package com.reserve.stats;

import com.reserve.auth.AuthUser;
import com.reserve.common.ApiException;
import com.reserve.stats.StatsDtos.DashboardStats;
import com.reserve.stats.StatsDtos.MyStats;
import com.reserve.stats.StatsDtos.PublicStats;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatsController {

    private final StatsService stats;

    public StatsController(StatsService stats) {
        this.stats = stats;
    }

    @GetMapping("/api/stats/public")
    public PublicStats publicStats() {
        return stats.publicStats();
    }

    @GetMapping("/api/stats/me")
    public MyStats me(@AuthenticationPrincipal AuthUser me) {
        return stats.myStats(me);
    }

    @GetMapping("/api/stats/dashboard")
    public DashboardStats dashboard(@RequestParam(defaultValue = "7") int days) {
        return stats.dashboard(checkDays(days));
    }

    @GetMapping("/api/export.csv")
    public ResponseEntity<String> export(@RequestParam(defaultValue = "7") int days) {
        String csv = stats.exportCsv(checkDays(days));
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reserve-donations-" + days + "d.csv\"")
                .body(csv);
    }

    private static int checkDays(int days) {
        if (days < 1 || days > 90) {
            throw ApiException.badRequest("Days must be between 1 and 90", Map.of("days", "Use 7 or 30"));
        }
        return days;
    }
}
