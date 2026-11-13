package com.reserve.user;

public record PersonRef(Long id, String name, String initials, String phone, String vehicle, String orgType,
                        Double rating, Long rescues) {

    public static PersonRef of(User u, Long rescues) {
        if (u == null) {
            return null;
        }
        return new PersonRef(u.getId(), u.getName(), u.initials(), u.getPhone(), u.getVehicle(), u.getOrgType(),
                u.getRating().doubleValue(), rescues);
    }
}
