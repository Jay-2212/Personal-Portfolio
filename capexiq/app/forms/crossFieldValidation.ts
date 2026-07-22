// Relationships between wizard fields that cannot be represented by one field's
// min/max metadata. Keep the exact user-facing copy here so field errors, the blocked
// transition summary, and tests all consume one source of truth.

import { RAMP_PERIODS } from "./payerAndRampKeys";
import type { WizardState } from "./wizardTypes";

const PER_USE_COST_PATHS = [
  "basic.consumableCostPerUse",
  "basic.professionalFeePerUse",
  "basic.otherVariableCostPerUse",
] as const;

const INDIVIDUAL_COST_MESSAGES: Record<(typeof PER_USE_COST_PATHS)[number], string> = {
  "basic.consumableCostPerUse": "Consumable cost cannot exceed the procedure price.",
  "basic.professionalFeePerUse": "Professional fee cannot exceed the procedure price.",
  "basic.otherVariableCostPerUse": "Other variable cost cannot exceed the procedure price.",
};

function utilizationRampError(path: string, state: WizardState): string | null {
  if (!path.startsWith("advanced.B.utilizationRampPct.")) return null;
  const values = RAMP_PERIODS.map(
    (period) => state.advanced.B.utilizationRampPct[period.suffix]
  );
  const enteredCount = values.filter((value) => value !== null).length;
  if (enteredCount > 0 && enteredCount < values.length) {
    return "Complete all four utilization ramp periods, or clear them all.";
  }
  if (enteredCount !== values.length) return null;
  const index = RAMP_PERIODS.findIndex((period) => path.endsWith(`.${period.suffix}`));
  if (index > 0 && (values[index] ?? 0) < (values[index - 1] ?? 0)) {
    return "Utilization ramp cannot decrease over time.";
  }
  return null;
}

export function crossFieldError(path: string, state: WizardState): string | null {
  const tariff = state.basic.billedTariffPerUse;
  if (PER_USE_COST_PATHS.includes(path as (typeof PER_USE_COST_PATHS)[number]) && tariff !== null) {
    const cost =
      path === "basic.consumableCostPerUse"
        ? state.basic.consumableCostPerUse
        : path === "basic.professionalFeePerUse"
          ? state.basic.professionalFeePerUse
          : state.basic.otherVariableCostPerUse;
    if (cost !== null && cost > tariff) {
      return INDIVIDUAL_COST_MESSAGES[path as (typeof PER_USE_COST_PATHS)[number]];
    }
    const total =
      (state.basic.consumableCostPerUse ?? 0) +
      (state.basic.professionalFeePerUse ?? 0) +
      (state.basic.otherVariableCostPerUse ?? 0);
    if (total > tariff) return "Total per-use costs cannot exceed the procedure price.";
  }

  const rampError = utilizationRampError(path, state);
  if (rampError) return rampError;

  if (path === "advanced.C.downPayment") {
    const downPayment = state.advanced.C.downPayment;
    const totalInvestment =
      (state.basic.purchaseCost ?? 0) + (state.basic.installationCost ?? 0);
    if (downPayment !== null && downPayment > totalInvestment) {
      return "Down payment cannot exceed the total purchase and installation cost.";
    }
  }

  if (path === "advanced.C.moratoriumPeriodMonths") {
    const moratorium = state.advanced.C.moratoriumPeriodMonths;
    const tenure = state.advanced.C.loanTenureMonths;
    if (moratorium !== null && tenure !== null && moratorium > tenure) {
      return "Moratorium period cannot exceed the loan tenure.";
    }
  }

  const warranty = state.basic.warrantyYears;
  const usefulLife = state.advanced.F.usefulLifeYears;
  if (
    (path === "basic.warrantyYears" || path === "advanced.F.usefulLifeYears") &&
    warranty !== null &&
    usefulLife !== null &&
    warranty > usefulLife
  ) {
    return "Warranty period cannot exceed the equipment's useful life.";
  }

  if (path === "advanced.E.cmcYears") {
    const cmcYears = state.advanced.E.cmcYears;
    if (
      cmcYears !== null &&
      warranty !== null &&
      usefulLife !== null &&
      cmcYears > Math.max(0, usefulLife - warranty)
    ) {
      return "CMC coverage cannot exceed the post-warranty useful life.";
    }
  }

  return null;
}
