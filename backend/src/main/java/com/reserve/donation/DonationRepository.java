package com.reserve.donation;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DonationRepository extends JpaRepository<Donation, Long> {

    List<Donation> findByStatusAndPickupUntilAfter(Status status, OffsetDateTime now);

    List<Donation> findByStatusInAndPickupUntilBefore(Collection<Status> statuses, OffsetDateTime now);

    List<Donation> findByStatusAndClaimedAtBefore(Status status, OffsetDateTime before);

    List<Donation> findByStatusAndClaimedAtIsNull(Status status);

    List<Donation> findByDonorIdOrderByCreatedAtDescIdDesc(Long donorId);

    List<Donation> findByVolunteerIdOrderByClaimedAtDesc(Long volunteerId);

    List<Donation> findByNgoIdOrderByClaimedAtDesc(Long ngoId);

    List<Donation> findByStatus(Status status);

    List<Donation> findByCreatedAtAfter(OffsetDateTime from);

    List<Donation> findByPickedUpAtAfter(OffsetDateTime from);

    List<Donation> findByDonorIdAndCreatedAtAfter(Long donorId, OffsetDateTime from);

    long countByStatusIn(Collection<Status> statuses);

    long countByDonorIdAndStatusIn(Long donorId, Collection<Status> statuses);

    long countByVolunteerIdAndStatus(Long volunteerId, Status status);

    long countByVolunteerIdAndStatusIn(Long volunteerId, Collection<Status> statuses);

    long countByDonorIdAndStatus(Long donorId, Status status);

    long countByNgoIdAndStatus(Long ngoId, Status status);

    @Query("select d.volunteer.id, count(d) from Donation d where d.status = com.reserve.donation.Status.DELIVERED group by d.volunteer.id")
    List<Object[]> deliveredCountsByVolunteer();

    // Live location pings update the row directly so they never bump the version
    @Modifying
    @Query("update Donation d set d.curLat = :lat, d.curLng = :lng, d.locAt = :at where d.id = :id")
    void updateLocation(@Param("id") Long id, @Param("lat") double lat, @Param("lng") double lng, @Param("at") OffsetDateTime at);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE donations SET status = 'CLAIMED', volunteer_id = :volunteerId, claimed_at = now(), version = version + 1 "
            + "WHERE id = :id AND status = 'ACCEPTED' AND ngo_id IS NOT NULL AND pickup_until > now()", nativeQuery = true)
    int claim(@Param("id") Long id, @Param("volunteerId") Long volunteerId);
}
