package com.reserve.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.Unit;
import org.junit.jupiter.api.Test;

class DonationDraftTest {

    @Test
    void validOutputPassesThroughWithEnumsParsed() {
        DonationDraft d = DonationDraft.clean(new ModelDraft(" Veg puffs ", "veg", "BAKERY", 24, "packs", 300, 30, 120, " Back gate "));

        assertEquals("Veg puffs", d.title());
        assertEquals(Diet.VEG, d.diet());
        assertEquals(Category.BAKERY, d.category());
        assertEquals(Unit.PACKS, d.unit());
        assertEquals(24, d.quantity());
        assertEquals(300, d.bestBeforeMinutes());
        assertEquals("Back gate", d.note());
    }

    @Test
    void unknownEnumsAndBlankTextBecomeNull() {
        DonationDraft d = DonationDraft.clean(new ModelDraft("  ", "VEGAN", "SNACKS", -1, "LITRES", -1, -1, -1, ""));

        assertNull(d.title());
        assertNull(d.diet());
        assertNull(d.category());
        assertNull(d.unit());
        assertNull(d.quantity());
        assertNull(d.bestBeforeMinutes());
        assertNull(d.note());
    }

    @Test
    void numbersAreClampedAndNegativeMeansUnknown() {
        DonationDraft high = DonationDraft.clean(new ModelDraft("a", null, null, 50000, null, 9999, 5000, 3000, null));
        DonationDraft low = DonationDraft.clean(new ModelDraft("a", null, null, 0, null, 0, 0, -5, null));

        assertEquals(10000, high.quantity());
        assertEquals(2880, high.bestBeforeMinutes());
        assertEquals(2880, high.pickupFromMinutes());
        assertEquals(2880, high.pickupUntilMinutes());
        assertEquals(1, low.quantity());
        assertEquals(0, low.bestBeforeMinutes());
        assertNull(low.pickupUntilMinutes());
    }

    @Test
    void longTitleIsTrimmedTo160() {
        DonationDraft d = DonationDraft.clean(new ModelDraft("x".repeat(300), null, null, null, null, null, null, null, null));

        assertEquals(160, d.title().length());
    }

    @Test
    void enumParsingIgnoresTheDefaultLocale() {
        java.util.Locale saved = java.util.Locale.getDefault();
        java.util.Locale.setDefault(java.util.Locale.forLanguageTag("tr"));
        try {
            DonationDraft d = DonationDraft.clean(new ModelDraft("a", "veg", "fruit_veg", null, "kg", null, null, null, null));

            assertEquals(Category.FRUIT_VEG, d.category());
        } finally {
            java.util.Locale.setDefault(saved);
        }
    }
}
