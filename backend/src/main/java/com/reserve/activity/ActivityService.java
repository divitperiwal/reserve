package com.reserve.activity;

import com.reserve.donation.Donation;
import com.reserve.stream.SseHub;
import com.reserve.user.User;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityService {

    private final ActivityRepository activities;
    private final SseHub hub;

    public ActivityService(ActivityRepository activities, SseHub hub) {
        this.activities = activities;
        this.hub = hub;
    }

    public void record(ActivityType type, User actor, Donation donation) {
        Activity saved = activities.save(new Activity(type, actor, donation, OffsetDateTime.now()));
        hub.broadcast("activity", ActivityDto.of(saved));
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> recent(int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return activities.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(0, size)).stream().map(ActivityDto::of).toList();
    }
}
