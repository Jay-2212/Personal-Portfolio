// Regression tests for ISS-31 — equipmentDefaults() previously divided
// purchaseCost.typical by 1 crore unconditionally, assuming every equipment-data file
// stores raw INR. cath-lab.json and dialysis.json actually declare their figure in
// Crore/Lakh units respectively (via their own purchaseCost.unit field), so the old
// code silently corrupted Cath Lab's default to 9e-7 Cr (should be 9 Cr) and
// Dialysis's to 1.15e-6 Cr (should be 0.115 Cr). MRI/CT/Ultrasound/Custom all have
// purchaseCost.typical: null, so they never hit this path either way — which is why
// the bug went uncaught until a live session first selected Cath Lab.

import { describe, expect, it } from "vitest";
import { equipmentDefaults } from "../../app/forms/equipmentDefaults";

describe("equipmentDefaults — purchaseCost/installationCost unit conversion", () => {
  it("Cath Lab: purchaseCost.typical is already Crore-denominated (unit: 'INR (Crore)') — must not be re-divided by 1 crore", () => {
    const defaults = equipmentDefaults("Cath Lab");
    expect(defaults.purchaseCost).toBeCloseTo(9, 6);
    expect(defaults.installationCost).toBeCloseTo(9 * 0.25, 6);
  });

  it("Dialysis: purchaseCost.typical is Lakh-denominated (unit: 'INR (Lakh)') — must divide by 100, not 1 crore", () => {
    const defaults = equipmentDefaults("Dialysis");
    expect(defaults.purchaseCost).toBeCloseTo(0.115, 6);
    expect(defaults.installationCost).toBeCloseTo(0.115 * 0.075, 6);
  });

  it("MRI: purchaseCost.typical is null (no sourced default) — stays null, not silently filled", () => {
    const defaults = equipmentDefaults("MRI");
    expect(defaults.purchaseCost).toBeNull();
    expect(defaults.installationCost).toBeNull();
  });

  it("never regresses to a near-zero scientific-notation default for any equipment category with a populated purchaseCost", () => {
    for (const category of ["MRI", "CT", "Cath Lab", "Dialysis", "Ultrasound", "Custom"] as const) {
      const defaults = equipmentDefaults(category);
      if (defaults.purchaseCost !== null) {
        expect(defaults.purchaseCost).toBeGreaterThan(0.001);
      }
    }
  });
});
