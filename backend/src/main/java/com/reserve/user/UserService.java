package com.reserve.user;

import com.reserve.common.ApiException;
import com.reserve.donation.DonationRepository;
import com.reserve.donation.Status;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final DonationRepository donations;

    public UserService(UserRepository users, DonationRepository donations) {
        this.users = users;
        this.donations = donations;
    }

    // A valid token for a user that no longer exists is treated as signed out
    public User get(Long id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again"));
    }

    public long rescues(User u) {
        return switch (u.getRole()) {
            case VOLUNTEER -> donations.countByVolunteerIdAndStatus(u.getId(), Status.DELIVERED);
            case DONOR -> donations.countByDonorIdAndStatus(u.getId(), Status.DELIVERED);
            case NGO -> donations.countByNgoIdAndStatus(u.getId(), Status.DELIVERED);
        };
    }

    public UserDto toDto(User u) {
        return UserDto.of(u, rescues(u));
    }

    @Transactional(readOnly = true)
    public UserDto me(Long id) {
        return toDto(get(id));
    }

    @Transactional
    public UserDto update(Long id, UpdateMeRequest req) {
        User u = get(id);
        if (req.name() != null) u.setName(req.name().trim());
        if (req.address() != null) u.setAddress(req.address().trim());
        if (req.lat() != null) u.setLat(req.lat());
        if (req.lng() != null) u.setLng(req.lng());
        if (req.vehicle() != null) u.setVehicle(req.vehicle().isBlank() ? null : req.vehicle().trim());
        if (req.onDuty() != null) u.setOnDuty(req.onDuty());
        if (req.acceptingFood() != null) u.setAcceptingFood(req.acceptingFood());
        if (req.dropNgoId() != null) {
            User ngo = users.findById(req.dropNgoId()).filter(n -> n.getRole() == Role.NGO)
                    .orElseThrow(() -> ApiException.badRequest("Pick a partner NGO", Map.of("dropNgoId", "Pick a partner NGO")));
            u.setDropNgo(ngo);
        }
        return toDto(u);
    }

    @Transactional(readOnly = true)
    public List<NgoRef> ngos() {
        return users.findByRoleOrderByNameAsc(Role.NGO).stream().map(NgoRef::of).toList();
    }
}
