package com.reserve.push;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByUserIdIn(Collection<Long> userIds);

    boolean existsByEndpointAndUserId(String endpoint, Long userId);

    long deleteByEndpointAndUserId(String endpoint, Long userId);
}
