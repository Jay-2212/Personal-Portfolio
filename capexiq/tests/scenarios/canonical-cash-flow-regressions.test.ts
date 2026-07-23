import { describe, expect, it } from "vitest";
import { emptyWizardState } from "../../app/forms/initialState";
import { toAssessmentInputs } from "../../app/forms/toAssessmentInputs";
import { wizardReducer } from "../../app/forms/wizardReducer";
import { buildMonthlyCashFlowSpine } from "../../formulas/cashFlowSpine";
import {
  computeAssessment,
  type AssessmentInputs,
} from "../../formulas/computeAssessment";

function baseInputs(
  overrides: Partial<AssessmentInputs> = {}
): AssessmentInputs {
  return {
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
    salvageValuePercentage: 0,
    ...overrides,
  };
}

describe("canonical cash-flow scenario regressions", () => {
  it("DSO delays cash and lowers NPV without destroying any collections", () => {
    const immediate = baseInputs();
    const delayed = baseInputs({
      payerMix: [
        {
          ...immediate.payerMix[0],
          collectionDelayDays: 90,
        },
      ],
    });
    const immediateSpine = buildMonthlyCashFlowSpine(immediate);
    const delayedSpine = buildMonthlyCashFlowSpine(delayed);

    expect(delayedSpine.monthlyCashReceived.slice(0, 3)).toEqual([0, 0, 0]);
    expect(
      delayedSpine.monthlyCashReceived.reduce((sum, value) => sum + value, 0)
    ).toBeCloseTo(
      immediateSpine.monthlyCashReceived.reduce(
        (sum, value) => sum + value,
        0
      ),
      6
    );
    expect(computeAssessment(delayed).npv).toBeLessThan(
      computeAssessment(immediate).npv
    );
  });

  it("launch delay inserts pre-operation months and lowers NPV", () => {
    const immediate = baseInputs({ launchDelayMonths: 0 });
    const delayed = baseInputs({ launchDelayMonths: 4 });
    const spine = buildMonthlyCashFlowSpine(delayed);

    expect(spine.monthlyBilledRevenue.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(spine.monthlyBilledRevenue[4]).toBeGreaterThan(0);
    expect(computeAssessment(delayed).npv).toBeLessThan(
      computeAssessment(immediate).npv
    );
  });

  it("loan rate, fees, and payment timing change only the appropriate equity cash-flow terms", () => {
    const favorable = baseInputs({
      launchDelayMonths: 2,
      financing: {
        type: "loan",
        downPayment: 100_000,
        interestRate: 8,
        tenureMonths: 60,
        processingChargesPct: 0,
        emiStartMonth: 2,
      },
    });
    const expensive = baseInputs({
      launchDelayMonths: 2,
      financing: {
        type: "loan",
        downPayment: 100_000,
        interestRate: 14,
        tenureMonths: 60,
        processingChargesPct: 2,
        emiStartMonth: 4,
      },
    });
    const favorableSpine = buildMonthlyCashFlowSpine(favorable);
    const expensiveSpine = buildMonthlyCashFlowSpine(expensive);

    expect(expensiveSpine.initialEquityOutlay).toBeGreaterThan(
      favorableSpine.initialEquityOutlay
    );
    expect(expensiveSpine.capitalizedInterest).toBeGreaterThan(
      favorableSpine.capitalizedInterest
    );
    expect(expensiveSpine.monthlyFinancingPayment[0]).toBe(0);
    expect(expensiveSpine.monthlyFinancingPayment[4]).toBeGreaterThan(0);
    expect(computeAssessment(expensive).npv).toBeLessThan(
      computeAssessment(favorable).npv
    );
  });

  it("salvage changes only terminal cash flow and increases NPV", () => {
    const noSalvage = baseInputs({ salvageValuePercentage: 0 });
    const withSalvage = baseInputs({ salvageValuePercentage: 10 });
    const without = buildMonthlyCashFlowSpine(noSalvage);
    const withValue = buildMonthlyCashFlowSpine(withSalvage);
    const differences = withValue.monthlyNetCashFlowAfterFinancing.map(
      (value, index) => value - without.monthlyNetCashFlowAfterFinancing[index]
    );

    const nonZeroDifferences = differences.filter(
      (value) => Math.abs(value) > 0.000001
    );
    expect(nonZeroDifferences).toHaveLength(1);
    expect(nonZeroDifferences[0]).toBeCloseTo(100_000, 6);
    expect(computeAssessment(withSalvage).npv).toBeGreaterThan(
      computeAssessment(noSalvage).npv
    );
  });

  it("closing and reopening Advanced deactivates and restores an entered launch override", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SELECT_EQUIPMENT_CATEGORY",
      category: "MRI",
    });
    state = wizardReducer(state, { type: "TOGGLE_ADVANCED" });
    state = wizardReducer(state, {
      type: "SET_FIELD",
      path: "advanced.D.civilWorkDurationMonths",
      value: 8,
    });
    expect(toAssessmentInputs(state).launchDelayMonths).toBe(8);

    state = wizardReducer(state, { type: "TOGGLE_ADVANCED" });
    expect(toAssessmentInputs(state).launchDelayMonths).toBe(
      state.basic.launchDelayMonths
    );
    state = wizardReducer(state, { type: "TOGGLE_ADVANCED" });
    expect(toAssessmentInputs(state).launchDelayMonths).toBe(8);
  });

  it("unit switching intentionally reinterprets the same entered number and recalculates project cost", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SET_FIELD",
      path: "basic.purchaseCost",
      value: 4,
    });
    expect(toAssessmentInputs(state).purchaseCost).toBe(40_000_000);

    state = wizardReducer(state, {
      type: "SET_CURRENCY_UNIT",
      field: "purchaseCost",
      unit: "Lakh",
    });
    expect(state.basic.purchaseCost).toBe(0.04);
    expect(toAssessmentInputs(state).purchaseCost).toBe(400_000);

    state = wizardReducer(state, {
      type: "SET_CURRENCY_UNIT",
      field: "purchaseCost",
      unit: "Crore",
    });
    expect(state.basic.purchaseCost).toBe(4);
    expect(toAssessmentInputs(state).purchaseCost).toBe(40_000_000);
  });
});
