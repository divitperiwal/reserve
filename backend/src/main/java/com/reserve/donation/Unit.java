package com.reserve.donation;

import java.math.BigDecimal;

public enum Unit {
    SERVINGS(1, "0.3", "servings"),
    KG(3, "1", "kg"),
    PACKS(1, "0.25", "packs");

    private final int mealsPerUnit;
    private final BigDecimal kgPerUnit;
    private final String label;

    Unit(int mealsPerUnit, String kgPerUnit, String label) {
        this.mealsPerUnit = mealsPerUnit;
        this.kgPerUnit = new BigDecimal(kgPerUnit);
        this.label = label;
    }

    public int meals(int quantity) {
        return quantity * mealsPerUnit;
    }

    public BigDecimal weightKg(int quantity) {
        return kgPerUnit.multiply(BigDecimal.valueOf(quantity));
    }

    public String label(int quantity) {
        return quantity + " " + label;
    }
}
