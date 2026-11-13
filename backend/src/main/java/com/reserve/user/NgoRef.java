package com.reserve.user;

public record NgoRef(Long id, String name, String address, double lat, double lng, boolean acceptingFood) {

    public static NgoRef of(User ngo) {
        return ngo == null ? null : new NgoRef(ngo.getId(), ngo.getName(), ngo.getAddress(), ngo.getLat(), ngo.getLng(), ngo.isAcceptingFood());
    }
}
