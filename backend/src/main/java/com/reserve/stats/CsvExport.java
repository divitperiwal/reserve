package com.reserve.stats;

import com.reserve.donation.Donation;
import com.reserve.user.User;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class CsvExport {

    private static final String HEADER = "code,title,category,diet,quantity,unit,meals,weightKg,status,donor,volunteer,ngo,"
            + "postedAt,claimedAt,pickedUpAt,deliveredAt,bestBefore";

    private CsvExport() {
    }

    static String write(List<Donation> donations) {
        StringBuilder sb = new StringBuilder(HEADER).append("\r\n");
        for (Donation d : donations) {
            sb.append(Stream.of(d.code(), d.getTitle(), d.getCategory().name(), d.getDiet().name(),
                            String.valueOf(d.getQuantity()), d.getUnit().name(), String.valueOf(d.meals()),
                            d.getWeightKg().toPlainString(), d.getStatus().name(), name(d.getDonor()),
                            name(d.getVolunteer()), name(d.getNgo()), time(d.getCreatedAt()), time(d.getClaimedAt()),
                            time(d.getPickedUpAt()), time(d.getDeliveredAt()), time(d.getBestBefore()))
                    .map(CsvExport::escape).collect(Collectors.joining(",")))
                    .append("\r\n");
        }
        return sb.toString();
    }

    private static String name(User u) {
        return u == null ? "" : u.getName();
    }

    private static String time(OffsetDateTime t) {
        return t == null ? "" : t.toString();
    }

    // Quote fields with separators and neutralise leading formula characters for spreadsheet apps
    private static String escape(String v) {
        String s = !v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0 ? "'" + v : v;
        return s.contains(",") || s.contains("\"") || s.contains("\n") ? "\"" + s.replace("\"", "\"\"") + "\"" : s;
    }
}
