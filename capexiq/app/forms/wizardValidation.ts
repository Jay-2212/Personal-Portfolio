// Field-level and step-level validation — wizard-state.md §2's "validate on every
// change, not on blur or submit" timing, evaluated against content/inputs-metadata.json
// via fieldSchema.ts (the single source of bounds/required-ness/error copy).

import { getFieldDefinition, type FieldDefinition } from "./fieldSchema";
import { getFieldValue } from "./fieldPath";
import { crossFieldError } from "./crossFieldValidation";
import { PAYER_TYPES, RAMP_PERIODS } from "./payerAndRampKeys";
import type { FieldValue, WizardState, WizardStep } from "./wizardTypes";

export function isRequiredIfSatisfiedOrNa(
  def: FieldDefinition,
  state: WizardState
): boolean {
  if (!def.requiredIf) return true;
  const match = /^acquisitionMode = (.+)$/.exec(def.requiredIf);
  if (!match) return true;
  return state.basic.acquisitionMode === match[1];
}

export function isFieldRequired(def: FieldDefinition, state: WizardState): boolean {
  if (def.required) return true;
  return def.requiredIf !== undefined && isRequiredIfSatisfiedOrNa(def, state);
}

export function validateFieldValue(
  def: FieldDefinition,
  value: FieldValue,
  state: WizardState
): string | null {
  const required = isFieldRequired(def, state);
  const isEmpty = value === null || value === "" || Number.isNaN(value as number);

  if (isEmpty) {
    return required ? (def.errorMessage ?? "This field is required.") : null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return def.errorMessage ?? "Enter a finite number.";
    if (def.integerOnly && !Number.isInteger(value)) {
      return def.errorMessage ?? "Enter a whole number.";
    }
    if (def.min !== undefined && value < def.min) return def.errorMessage ?? null;
    if (def.max !== undefined && value > def.max) return def.errorMessage ?? null;
  }

  if (typeof value === "string" && def.maxLength !== undefined) {
    if (value.length > def.maxLength) return def.errorMessage ?? null;
  }
  if (typeof value === "string" && def.options && !def.options.includes(value)) {
    return def.errorMessage ?? "Select one of the available options.";
  }

  return crossFieldError(def.path, state);
}

/** The payer-mix group constraint — one error, anchored to the group heading, shared
 *  by all 5 sliders' aria-describedby (wizard-state.md §2). */
export function payerMixGroupError(state: WizardState): string | null {
  const total = PAYER_TYPES.reduce(
    (sum, payer) => sum + (state.advanced.A.payerMixSharePct[payer.suffix] ?? 0),
    0
  );
  if (Math.abs(total - 100) > 0.05) {
    return `Payer mix shares must sum to 100% (currently ${total.toFixed(1)}%).`;
  }
  return null;
}

const STEP_FIELD_PATHS: Record<Exclude<WizardStep, "results">, string[]> = {
  preStep: [
    "preStep.equipmentCategory",
    "preStep.hospitalName",
    "preStep.hospitalBedSize",
    "preStep.cityTier",
    "preStep.hospitalType",
    "preStep.equipmentNameModel",
  ],
  investment: [
    "basic.purchaseCost",
    "basic.installationCost",
    "basic.launchDelayMonths",
    "basic.acquisitionMode",
  ],
  usage: ["basic.usagePerDay", "basic.billedTariffPerUse", "basic.workingDaysPerMonth"],
  costs: [
    "basic.consumableCostPerUse",
    "basic.professionalFeePerUse",
    "basic.otherVariableCostPerUse",
    "basic.staffCostPerMonth",
    "basic.electricityCostPerMonth",
    "basic.otherFixedCostPerMonth",
    "basic.warrantyYears",
    "basic.amcCmcCostPostWarranty",
    "advanced.F.discountRate",
    "advanced.F.targetIrr",
    "advanced.F.usefulLifeYears",
    "advanced.F.salvageValuePercentage",
    "advanced.C.downPayment",
    "advanced.C.loanInterestRate",
    "advanced.C.loanTenureMonths",
    "advanced.C.leaseRentalPerMonth",
    "advanced.C.leaseTenureMonths",
    ...PAYER_TYPES.flatMap((p) => [
      `advanced.A.payerMixSharePct.${p.suffix}`,
      `advanced.A.billedTariffByPayerType.${p.suffix}`,
      `advanced.A.realizationPctByPayerType.${p.suffix}`,
      `advanced.A.claimDeductionPctByPayerType.${p.suffix}`,
      `advanced.A.collectionDelayDaysByPayerType.${p.suffix}`,
    ]),
    ...RAMP_PERIODS.map((p) => `advanced.B.utilizationRampPct.${p.suffix}`),
    "advanced.B.expectedMatureUtilization",
    "advanced.C.processingChargesPct",
    "advanced.C.emiStartMonth",
    "advanced.C.moratoriumPeriodMonths",
    "advanced.D.civilWorkDurationMonths",
    "advanced.D.installationDurationMonths",
    "advanced.D.licensingApprovalDurationMonths",
    "advanced.D.trainingCommissioningDurationMonths",
    "advanced.D.preOpeningFixedCosts",
    "advanced.D.workingCapitalBufferAmount",
    "advanced.E.cmcYears",
    "advanced.E.maintenanceInflationPct",
    "advanced.E.majorReplacementCost",
    "advanced.F.depreciationMethod",
    "advanced.F.priceEscalationPct",
    "advanced.F.costEscalationPct",
  ],
};

export { STEP_FIELD_PATHS };

const ALWAYS_ACTIVE_ADVANCED_PATHS = new Set([
  "advanced.F.discountRate",
  "advanced.F.targetIrr",
  "advanced.F.usefulLifeYears",
  "advanced.F.salvageValuePercentage",
  "advanced.C.downPayment",
  "advanced.C.loanInterestRate",
  "advanced.C.loanTenureMonths",
  "advanced.C.leaseRentalPerMonth",
  "advanced.C.leaseTenureMonths",
]);

export function isFieldActive(path: string, state: WizardState): boolean {
  if (!path.startsWith("advanced.")) return true;
  return state.advancedOpen || ALWAYS_ACTIVE_ADVANCED_PATHS.has(path);
}

/** ISS-25: which step a field's error-reveal gate (touched || attempted[step])
 *  should check. Deliberately NOT derived from `state.currentStep` — that's only
 *  synced by RouteGuard's effect on route change, which lags render by one commit
 *  (the same class of race ISS-26 fixed for hydration) and is unset entirely in any
 *  test/context that renders a field without RouteGuard mounted. A field's step is a
 *  static fact about the field, not something that should depend on which route
 *  happens to be active when it renders.
 *  `preStep.*`/`basic.*` are exhaustively covered by STEP_FIELD_PATHS (6 and 15
 *  fields respectively, matching PreStepFields/BasicFields exactly) — every
 *  `advanced.*` path not explicitly listed there still belongs to "costs", since
 *  AdvancedPanel (all of Groups A-F) only ever mounts on the costs step page. */
export function stepForFieldPath(path: string): Exclude<WizardStep, "results"> | null {
  for (const step of Object.keys(STEP_FIELD_PATHS) as Exclude<WizardStep, "results">[]) {
    if (STEP_FIELD_PATHS[step].includes(path)) return step;
  }
  if (path.startsWith("advanced.")) return "costs";
  return null;
}

/** The first invalid/missing required field on a step, in field order — used both by
 *  the step-gate and by the disabled-"Next" focus behavior (wizard-state.md §2, audit
 *  F7): clicking a disabled Next moves focus here. */
export function firstInvalidFieldOnStep(
  step: Exclude<WizardStep, "results">,
  state: WizardState
): string | null {
  return validationIssuesOnStep(step, state)[0]?.path ?? null;
}

export interface ValidationIssue {
  step: Exclude<WizardStep, "results">;
  path: string;
  fieldLabel: string;
  message: string;
}

export function validationIssuesOnStep(
  step: Exclude<WizardStep, "results">,
  state: WizardState
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const path of STEP_FIELD_PATHS[step]) {
    if (!isFieldActive(path, state)) continue;
    const def = getFieldDefinition(path);
    const message = validateFieldValue(def, getFieldValue(state, path), state);
    if (message) issues.push({ step, path, fieldLabel: def.label, message });
  }
  if (
    step === "investment" &&
    state.basic.purchaseCost !== null &&
    state.basic.installationCost !== null &&
    state.basic.purchaseCost + state.basic.installationCost <= 0 &&
    !issues.some((issue) => issue.path === "basic.purchaseCost")
  ) {
    issues.push({
      step,
      path: "basic.purchaseCost",
      fieldLabel: getFieldDefinition("basic.purchaseCost").label,
      message: "Total purchase and installation cost must be greater than zero.",
    });
  }
  if (step === "costs" && state.advancedOpen) {
    const scheduleDef = getFieldDefinition("advanced.E.maintenanceCostByYearPct");
    state.advanced.E.maintenanceCostByYearPct.forEach((value, index) => {
      const message = validateFieldValue(scheduleDef, value, state);
      if (message) {
        issues.push({
          step,
          path: `advanced.E.maintenanceCostByYearPct.${index}`,
          fieldLabel: `AMC / CMC cost — Year ${index + 1}`,
          message,
        });
      }
    });
    const message = payerMixGroupError(state);
    if (message) {
      issues.push({
        step,
        path: "advanced.A.payerMixSharePct.privateCash",
        fieldLabel: "Payer mix",
        message,
      });
    }
  }
  return issues;
}

const STEP_ORDER: WizardStep[] = ["preStep", "investment", "usage", "costs", "results"];

export function validationIssuesThroughStep(
  step: Exclude<WizardStep, "results">,
  state: WizardState
): ValidationIssue[] {
  const end = STEP_ORDER.indexOf(step);
  const start = step === "preStep" ? 0 : 1;
  return STEP_ORDER.slice(start, end + 1).flatMap((candidate) =>
    candidate === "results"
      ? []
      : validationIssuesOnStep(candidate as Exclude<WizardStep, "results">, state)
  );
}

export function isStepComplete(
  step: Exclude<WizardStep, "results">,
  state: WizardState
): boolean {
  return firstInvalidFieldOnStep(step, state) === null;
}

/** wizard-state.md §2's route guard — the earliest step whose prerequisites are not
 *  yet complete, or null if every step up to and including `upTo` is complete. */
export function earliestIncompleteStep(
  state: WizardState,
  upTo: WizardStep = "results"
): WizardStep | null {
  const upToIndex = STEP_ORDER.indexOf(upTo);
  for (let i = 0; i < upToIndex; i += 1) {
    const step = STEP_ORDER[i] as Exclude<WizardStep, "results">;
    if (!isStepComplete(step, state)) return step;
  }
  return null;
}

/** wizard-state.md §4's fresh/stale contract: fresh once every currently-relevant
 *  field up through Step 3 is valid. */
export function isResultStateFresh(state: WizardState): boolean {
  return (
    isStepComplete("investment", state) &&
    isStepComplete("usage", state) &&
    isStepComplete("costs", state)
  );
}
