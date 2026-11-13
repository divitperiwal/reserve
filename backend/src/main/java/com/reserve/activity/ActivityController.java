package com.reserve.activity;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ActivityController {

    private final ActivityService activities;

    public ActivityController(ActivityService activities) {
        this.activities = activities;
    }

    @GetMapping("/api/activity")
    public List<ActivityDto> recent(@RequestParam(defaultValue = "20") int limit) {
        return activities.recent(limit);
    }
}
