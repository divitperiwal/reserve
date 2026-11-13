package com.reserve.donation;

import com.reserve.auth.AuthUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/donations")
public class DonationController {

    private final DonationService donations;

    public DonationController(DonationService donations) {
        this.donations = donations;
    }

    @GetMapping("/feed")
    public List<DonationDto> feed(@AuthenticationPrincipal AuthUser me,
                                  @RequestParam(required = false) Double lat,
                                  @RequestParam(required = false) Double lng,
                                  @RequestParam(required = false) Double radiusKm,
                                  @RequestParam(required = false) Double withinHours,
                                  @RequestParam(required = false) Diet diet,
                                  @RequestParam(required = false) Category category,
                                  @RequestParam(required = false) String sort,
                                  @RequestParam(required = false) String q) {
        return donations.feed(me, new FeedQuery(lat, lng, radiusKm, withinHours, diet, category, sort, q));
    }

    @GetMapping("/mine")
    public List<DonationDto> mine(@AuthenticationPrincipal AuthUser me) {
        return donations.mine(me);
    }

    @GetMapping("/{id}")
    public DonationDto get(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return donations.get(me, id);
    }

    @PostMapping
    public DonationDto create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody DonationRequests.Create req) {
        return donations.create(me, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        donations.cancel(me, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/accept")
    public DonationDto accept(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                              @RequestBody(required = false) DonationRequests.Accept req) {
        return donations.accept(me, id, req == null ? null : req.quantity());
    }

    @PostMapping("/{id}/withdraw")
    public DonationDto withdraw(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return donations.withdraw(me, id);
    }

    @PostMapping("/{id}/claim")
    public DonationDto claim(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return donations.claim(me, id);
    }

    @PostMapping("/{id}/release")
    public DonationDto release(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return donations.release(me, id);
    }

    @PostMapping("/{id}/confirm-pickup")
    public DonationDto confirmPickup(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                     @Valid @RequestBody DonationRequests.Code req) {
        return donations.confirmPickup(me, id, req.code());
    }

    @PostMapping("/{id}/confirm-delivery")
    public DonationDto confirmDelivery(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                       @Valid @RequestBody DonationRequests.Code req) {
        return donations.confirmDelivery(me, id, req.code());
    }

    @PostMapping("/{id}/location")
    public ResponseEntity<Void> location(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                         @Valid @RequestBody DonationRequests.Location req) {
        donations.recordLocation(me, id, req.lat(), req.lng());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/nearby-volunteers")
    public NearbyVolunteers nearbyVolunteers(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return donations.nearbyVolunteers(me, id);
    }

    @GetMapping("/{id}/route")
    public List<GeoPoint> route(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return donations.route(me, id);
    }
}
