import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExportPanel } from "../../app/components/ExportPanel";
import {
  computeAssessment,
  type AssessmentInputs,
} from "../../formulas/computeAssessment";

const inputs: AssessmentInputs = {
  purchaseCost: 1_000_000,
  installationCost: 100_000,
  usagePerDay: 10,
  workingDaysPerMonth: 25,
  payerMix: [
    {
      payerName: "cash",
      shareOfVolume: 100,
      billedTariff: 1_000,
      realizationPercentage: 100,
      collectionDelayDays: 0,
    },
  ],
  variableCostPerUse: 100,
  fixedCostPerMonth: 50_000,
  financing: { type: "cash" },
  maintenance: {
    warrantyYears: 1,
    cmcYears: 0,
    cmcAnnualCost: 0,
    amcAnnualCost: 20_000,
  },
  usefulLifeYears: 5,
  discountRate: 12.5,
  salvageValuePercentage: 5,
};

describe("ExportPanel validity gate", () => {
  it("disables every export and explains recovery when the displayed result is stale", () => {
    render(
      <ExportPanel
        inputs={inputs}
        result={computeAssessment(inputs)}
        hospitalName="Test Hospital"
        equipmentCategory="MRI"
        disabled
      />
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
    for (const button of screen.getAllByRole("button")) {
      expect(button.hasAttribute("disabled")).toBe(true);
    }
    expect(
      screen.getByText(/fix the highlighted inputs to refresh/i)
    ).not.toBeNull();
  });
});
