package com.reserve.user;

public record UserDto(Long id, Role role, String name, String phone, String initials, String orgType, String vehicle,
                      String address, double lat, double lng, boolean verified, boolean onDuty, boolean acceptingFood, NgoRef dropNgo,
                      double rating, long rescues) {

    public static UserDto of(User u, long rescues) {
        return new UserDto(u.getId(), u.getRole(), u.getName(), u.getPhone(), u.initials(), u.getOrgType(),
                u.getVehicle(), u.getAddress(), u.getLat(), u.getLng(), u.isVerified(), u.isOnDuty(), u.isAcceptingFood(),
                NgoRef.of(u.getDropNgo()), u.getRating().doubleValue(), rescues);
    }
}
