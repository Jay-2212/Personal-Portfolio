// Canonical scenario comparison for Results.
//
// A scenario is deliberately a small transformation of a complete AssessmentInputs
// snapshot. computeAssessment() still owns every financial calculation, including DSO,
// launch timing, financing, lifecycle costs, escalation, and terminal value.

import {
  computeAssessment,
  type AssessmentInputs,
  type AssessmentResult,
} from "./computeAssessment";

export interface AssessmentScenarioAdjustments {
  usageChangePercentage: number;
  tariffChangePercentage: number;
}

export interface AssessmentScenario {
  inputs: AssessmentInputs;
  result: AssessmentResult;
  weightedBilledTariffPerUse: number;
}

function multiplierFromPercentage(changePercentage: number): number {
  if (!Number.isFinite(changePercentage) || changePercentage < -100) {
    throw new RangeError("Scenario changes must be finite and cannot reduce below zero.");
  }

  return 1 + changePercentage / 100;
}

export function weightedBilledTariff(inputs: AssessmentInputs): number {
  return inputs.payerMix.reduce(
    (total, payer) =>
      total + (payer.shareOfVolume / 100) * payer.billedTariff,
    0
  );
}

export function runAssessmentScenario(
  baseline: AssessmentInputs,
  adjustments: AssessmentScenarioAdjustments
): AssessmentScenario {
  const usageMultiplier = multiplierFromPercentage(
    adjustments.usageChangePercentage
  );
  const tariffMultiplier = multiplierFromPercentage(
    adjustments.tariffChangePercentage
  );
  const inputs: AssessmentInputs = {
    ...baseline,
    usagePerDay: baseline.usagePerDay * usageMultiplier,
    payerMix: baseline.payerMix.map((payer) => ({
      ...payer,
      billedTariff: payer.billedTariff * tariffMultiplier,
    })),
  };

  return {
    inputs,
    result: computeAssessment(inputs),
    weightedBilledTariffPerUse: weightedBilledTariff(inputs),
  };
}
