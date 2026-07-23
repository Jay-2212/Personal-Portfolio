import { describe, expect, it } from "vitest";
import { buildMonthlyCashFlowSpine } from "../../formulas/cashFlowSpine";
import type { AssessmentInputs } from "../../formulas/computeAssessment";

function baseInputs(
  overrides: Partial<AssessmentInputs> = {}
): AssessmentInputs {
  return {
    purchaseCost: 1_000_000,
    installationCost: 100_000,
    usagePerDay: 1,
    workingDaysPerMonth: 1,
    payerMix: [
      {
        payerName: "cash",
        shareOfVolume: 100,
        billedTariff: 300,
        realizationPercentage: 100,
        collectionDelayDays: 0,
      },
    ],
    variableCostPerUse: 0,
    fixedCostPerMonth: 0,
    financing: { type: "cash" },
    maintenance: {
      warrantyYears: 1,
      cmcYears: 0,
      cmcAnnualCost: 0,
      amcAnnualCost: 0,
    },
    usefulLifeYears: 1,
    discountRate: 12,
    salvageValuePercentage: 10,
    ...overrides,
  };
}

describe("buildMonthlyCashFlowSpine", () => {
  it("places launch, DSO collections, terminal salvage, and buffer release on one conserved monthly timeline", () => {
    const spine = buildMonthlyCashFlowSpine(
      baseInputs({
        launchDelayMonths: 2,
        preOpeningFixedCosts: 20_000,
        workingCapitalBufferAmount: 50_000,
        payerMix: [
          {
            payerName: "credit",
            shareOfVolume: 100,
            billedTariff: 300,
            realizationPercentage: 100,
            collectionDelayDays: 60,
          },
        ],
      })
    );

    expect(spine.initialEquityOutlay).toBe(1_170_000);
    expect(spine.operationStartMonth).toBe(2);
    expect(spine.operationEndMonth).toBe(14);
    expect(spine.monthlyBilledRevenue.slice(0, 2)).toEqual([0, 0]);
    expect(spine.monthlyCashReceived.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(spine.monthlyCashReceived[4]).toBe(300);
    expect(spine.monthlyCashReceived).toHaveLength(16);
    expect(spine.monthlyCashReceived.reduce((sum, value) => sum + value, 0)).toBe(
      spine.monthlyRealizedRevenue.reduce((sum, value) => sum + value, 0)
    );
    expect(spine.monthlyNetCashFlowAfterFinancing[13]).toBe(150_300);
    expect(spine.monthlyNetCashFlowAfterFinancing[15]).toBe(300);
  });

  it("uses an equity basis for loans and capitalizes only interest before debt service starts", () => {
    const spine = buildMonthlyCashFlowSpine(
      baseInputs({
        purchaseCost: 900_000,
        launchDelayMonths: 2,
        preOpeningFixedCosts: 50,
        workingCapitalBufferAmount: 25,
        financing: {
          type: "loan",
          downPayment: 100_000,
          interestRate: 12,
          tenureMonths: 12,
          processingChargesPct: 2,
          emiStartMonth: 3,
        },
      })
    );

    expect(spine.processingCharges).toBe(18_000);
    expect(spine.capitalizedInterest).toBe(27_000);
    expect(spine.financedPrincipal).toBe(927_000);
    expect(spine.initialEquityOutlay).toBe(118_075);
    expect(spine.monthlyFinancingPayment.slice(0, 3)).toEqual([0, 0, 0]);
    expect(spine.monthlyFinancingPayment[3]).toBeGreaterThan(0);
    expect(spine.monthlyFinancingPayment.filter((value) => value > 0)).toHaveLength(
      12
    );
  });

  it("treats a lease as owner-funded installation plus timed rentals, with terminal salvage under the ownership contract", () => {
    const spine = buildMonthlyCashFlowSpine(
      baseInputs({
        launchDelayMonths: 1,
        financing: {
          type: "lease",
          rentalPerMonth: 10_000,
          tenureMonths: 3,
          paymentStartMonth: 2,
        },
      })
    );

    expect(spine.initialEquityOutlay).toBe(100_000);
    expect(spine.monthlyFinancingPayment.slice(0, 5)).toEqual([
      0,
      0,
      10_000,
      10_000,
      10_000,
    ]);
    expect(spine.monthlyFinancingPayment.slice(5).every((value) => value === 0)).toBe(
      true
    );
    expect(spine.terminalSalvageValue).toBe(100_000);
    expect(spine.monthlyNetCashFlowAfterFinancing[12]).toBe(100_300);
  });
});
