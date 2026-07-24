import { describe, expect, it } from "vitest";
import {
  runAssessmentScenario,
  weightedBilledTariff,
} from "../../formulas/assessmentScenario";
import {
  computeAssessment,
  type AssessmentInputs,
} from "../../formulas/computeAssessment";

const inputs: AssessmentInputs = {
  purchaseCost: 30_000_000,
  installationCost: 2_000_000,
  usagePerDay: 10,
  workingDaysPerMonth: 25,
  payerMix: [
    {
      payerName: "Cash",
      shareOfVolume: 60,
      billedTariff: 5_000,
      realizationPercentage: 100,
      collectionDelayDays: 0,
    },
    {
      payerName: "Insurance",
      shareOfVolume: 40,
      billedTariff: 4_000,
      realizationPercentage: 85,
      collectionDelayDays: 60,
    },
  ],
  variableCostPerUse: 700,
  fixedCostPerMonth: 350_000,
  financing: {
    type: "loan",
    downPayment: 8_000_000,
    interestRate: 11.5,
    tenureMonths: 60,
    processingChargesPct: 1,
    emiStartMonth: 3,
  },
  maintenance: {
    warrantyYears: 1,
    cmcYears: 2,
    cmcAnnualCost: 1_200_000,
    amcAnnualCost: 700_000,
  },
  usefulLifeYears: 8,
  discountRate: 12.5,
  salvageValuePercentage: 5,
  launchDelayMonths: 2,
};

describe("runAssessmentScenario", () => {
  it("returns the exact canonical result for the unchanged current case", () => {
    const scenario = runAssessmentScenario(inputs, {
      usageChangePercentage: 0,
      tariffChangePercentage: 0,
    });

    expect(scenario.result).toEqual(computeAssessment(inputs));
    expect(scenario.inputs).not.toBe(inputs);
    expect(scenario.inputs.payerMix).not.toBe(inputs.payerMix);
  });

  it("changes usage and every payer tariff while preserving all other assumptions", () => {
    const scenario = runAssessmentScenario(inputs, {
      usageChangePercentage: -20,
      tariffChangePercentage: 10,
    });

    expect(scenario.inputs.usagePerDay).toBe(8);
    expect(scenario.inputs.payerMix.map((payer) => payer.billedTariff)).toEqual([
      5_500, 4_400,
    ]);
    expect(scenario.inputs.financing).toBe(inputs.financing);
    expect(scenario.inputs.maintenance).toBe(inputs.maintenance);
    expect(scenario.result.npv).not.toBe(computeAssessment(inputs).npv);
  });

  it("handles the zero-demand boundary without mutating the baseline", () => {
    const scenario = runAssessmentScenario(inputs, {
      usageChangePercentage: -100,
      tariffChangePercentage: 0,
    });

    expect(scenario.inputs.usagePerDay).toBe(0);
    expect(scenario.result.paybackYearsFromCashFlows).toBe(Infinity);
    expect(inputs.usagePerDay).toBe(10);
  });

  it("rejects non-finite or below-zero percentage multipliers", () => {
    expect(() =>
      runAssessmentScenario(inputs, {
        usageChangePercentage: -101,
        tariffChangePercentage: 0,
      })
    ).toThrow(RangeError);
    expect(() =>
      runAssessmentScenario(inputs, {
        usageChangePercentage: 0,
        tariffChangePercentage: Number.NaN,
      })
    ).toThrow(RangeError);
  });

  it("computes the weighted billed tariff from payer shares", () => {
    expect(weightedBilledTariff(inputs)).toBe(4_600);
  });
});
