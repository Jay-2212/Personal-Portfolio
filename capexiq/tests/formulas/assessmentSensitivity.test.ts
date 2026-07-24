import { describe, expect, it } from "vitest";
import {
  buildSensitivitySeries,
  runSensitivityPoint,
} from "../../formulas/sensitivity";
import { computeAssessment, type AssessmentInputs } from "../../formulas/computeAssessment";

const inputs: AssessmentInputs = {
  purchaseCost: 30_000_000,
  installationCost: 2_000_000,
  usagePerDay: 10,
  workingDaysPerMonth: 25,
  payerMix: [
    {
      payerName: "Cash",
      shareOfVolume: 70,
      billedTariff: 5_000,
      realizationPercentage: 100,
      collectionDelayDays: 0,
    },
    {
      payerName: "Insurance",
      shareOfVolume: 30,
      billedTariff: 4_000,
      realizationPercentage: 82,
      collectionDelayDays: 75,
    },
  ],
  variableCostPerUse: 700,
  fixedCostPerMonth: 300_000,
  financing: { type: "cash" },
  maintenance: {
    warrantyYears: 1,
    cmcYears: 2,
    cmcAnnualCost: 1_200_000,
    amcAnnualCost: 800_000,
  },
  usefulLifeYears: 8,
  discountRate: 12.5,
  salvageValuePercentage: 5,
  launchDelayMonths: 3,
};

describe("canonical assessment sensitivity", () => {
  it("uses the unchanged canonical assessment at the zero point", () => {
    const point = runSensitivityPoint(inputs, "usage", 0);

    expect(point.driverValue).toBe(10);
    expect(point.assessment.result).toEqual(computeAssessment(inputs));
  });

  it("changes only usage for a usage sensitivity point", () => {
    const point = runSensitivityPoint(inputs, "usage", -35);

    expect(point.driverValue).toBe(6.5);
    expect(point.assessment.inputs.payerMix).toEqual(inputs.payerMix);
    expect(point.assessment.inputs.financing).toBe(inputs.financing);
  });

  it("changes every payer tariff proportionally for tariff sensitivity", () => {
    const point = runSensitivityPoint(inputs, "tariff", 12.5);

    expect(point.driverValue).toBe(5_287.5);
    expect(point.assessment.inputs.usagePerDay).toBe(inputs.usagePerDay);
    expect(point.assessment.inputs.payerMix.map((payer) => payer.billedTariff)).toEqual([
      5_625, 4_500,
    ]);
  });

  it("builds an ordered, deterministic series from explicit points", () => {
    const changes = [-40, 0, 40];
    const first = buildSensitivitySeries(inputs, "usage", changes);
    const second = buildSensitivitySeries(inputs, "usage", changes);

    expect(first).toEqual(second);
    expect(first.map((point) => point.changePercentage)).toEqual(changes);
    expect(first[0].assessment.result.npv).toBeLessThan(
      first[2].assessment.result.npv
    );
  });
});
