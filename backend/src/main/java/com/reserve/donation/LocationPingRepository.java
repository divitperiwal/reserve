package com.reserve.donation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationPingRepository extends JpaRepository<LocationPing, Long> {

    List<LocationPing> findByDonationIdOrderByRecordedAtAsc(Long donationId);
}
