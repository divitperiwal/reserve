package com.reserve.ai;

import com.reserve.auth.AuthUser;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiDraftService drafts;

    public AiController(AiDraftService drafts) {
        this.drafts = drafts;
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", drafts.enabled());
    }

    @PostMapping("/draft")
    public DonationDraft draft(@AuthenticationPrincipal AuthUser me, @RequestBody DraftRequest req) {
        return drafts.draft(me, req);
    }
}
