// Maps a (valid) WizardState to formulas/computeAssessment.ts's AssessmentInputs — the
// second half of wizard-state.md §4's "exactly one derivation" requirement (the first
// half, resolvePayerMix, is separate because it's independently reusable/testable).
// Callers must only invoke this once every currently-relevant required field is valid
// (see app/forms/wizardValidation.ts's isResultStateFresh) — this function assumes
// non-null inputs and does not itself guard against missing data.

import type { AssessmentInputs, UtilizationRampUp } from "@/formulas/computeAssessment";
import { resolvePayerMix } from "./resolvePayerMix";
import { equipmentDefaults } from "./equipmentDefaults";
import { RAMP_PERIODS } from "./payerAndRampKeys";
import type { WizardState } from "./wizardTypes";

const CRORE = 10_000_000;

export function toAssessmentInputs(state: WizardState): AssessmentInputs {
  const { basic, advanced, preStep } = state;
  const purchaseCost = (basic.purchaseCost ?? 0) * CRORE;
  const installationCost = (basic.installationCost ?? 0) * CRORE;
  const usefulLifeYears = advanced.F.usefulLifeYears ?? 1;
  const warrantyYears = basic.warrantyYears ?? 0;

  let cmcYears: number;
  let cmcAnnualCost: number;
  let amcAnnualCost: number;

  // ISS-32: `advanced.E.cmcYears` is pre-populated with the equipment's default the
  // moment equipment is selected (applyEquipmentDefaults, app/forms/initialState.ts) —
  // long before Advanced Mode is ever opened, let alone this specific field edited. So
  // `advancedOpen` alone (the previous gate) switched to the granular CMC/AMC schedule
  // the instant the panel opened, silently discarding the user's Basic-Mode blended
  // answer with zero new input — live-verified: MRI's score moved 96→100 just from
  // clicking "Enter Advanced Mode". `state.touched` (already the source of truth for
  // every other "has the user actually engaged with this field" check in the wizard,
  // e.g. useFieldController's own error-display gate) is the correct, existing signal
  // — it's only set true by an actual SET_FIELD dispatch, never by
  // applyEquipmentDefaults' silent pre-population. Matches Group B's ramp-up ("only
  // applies once every period has a user-entered value") and Group C's financing
  // (only relevant once acquisition mode is Loan/Lease): Advanced precedence should
  // require the user to have actually done something in that group, not merely opened
  // the panel.
  const cmcYearsTouched = state.touched["advanced.E.cmcYears"] === true;

  if (!cmcYearsTouched) {
    // Basic Mode's flat blended rate for the whole post-warranty period
    // (capexiq-prebuild-assurance PBA-4) — cmcYears is 0 so the schedule goes
    // straight from warranty to a flat "amc" rate equal to the blended figure. Stays
    // in effect even with Advanced Mode open, until the user actually edits Group E's
    // CMC coverage period.
    cmcYears = 0;
    cmcAnnualCost = 0;
    amcAnnualCost = ((basic.amcCmcCostPostWarranty ?? 0) / 100) * purchaseCost;
  } else {
    const defaults = preStep.equipmentCategory
      ? equipmentDefaults(preStep.equipmentCategory)
      : null;
    cmcYears = advanced.E.cmcYears ?? defaults?.cmcYears ?? 0;
    cmcAnnualCost =
      ((defaults?.cmcAnnualCostPercentage ?? 0) / 100) * purchaseCost;
    amcAnnualCost =
      ((defaults?.amcAnnualCostPercentage ?? 0) / 100) * purchaseCost;
  }

  const financing: AssessmentInputs["financing"] =
    basic.acquisitionMode === "Loan"
      ? {
          type: "loan",
          downPayment: (advanced.C.downPayment ?? 0) * CRORE,
          interestRate: advanced.C.loanInterestRate ?? 0,
          tenureMonths: advanced.C.loanTenureMonths ?? 1,
        }
      : basic.acquisitionMode === "Lease"
        ? {
            type: "lease",
            rentalPerMonth: advanced.C.leaseRentalPerMonth ?? 0,
            tenureMonths: advanced.C.leaseTenureMonths ?? 1,
          }
        : { type: "cash" };

  // ISS-19 / ISS-32: Advanced Group B's expectedMatureUtilization defaults to
  // basic.usagePerDay (content/inputs-metadata.json's own defaultSource note) but is
  // independently editable once Advanced Mode is open — once a user has deliberately
  // entered a separate mature-utilization figure there, that supersedes the Basic Mode
  // number as the ramp's 100% baseline. The gate is `touched`, not `advancedOpen`:
  // applyEquipmentDefaults pre-populates expectedMatureUtilization with the equipment
  // default the moment equipment is selected, so gating on advancedOpen alone silently
  // reverted a user's hand-typed Basic Mode answer (verified: 18 reverted to MRI's
  // 23-scan default) the instant the panel opened, before the user touched Group B at
  // all. Basic-Mode-only users, and Advanced-Mode users who haven't edited this
  // specific field, are both unaffected.
  const usagePerDay =
    (state.touched["advanced.B.expectedMatureUtilization"] === true
      ? advanced.B.expectedMatureUtilization
      : null) ??
    basic.usagePerDay ??
    0;

  // Ramp only applies once every period has a user-entered value — a partially-filled
  // ramp isn't a meaningful schedule, and Basic Mode never populates any of these, so
  // this correctly stays undefined (flat mature usage) for the common case.
  const rampPct = advanced.B.utilizationRampPct;
  const hasFullRamp = RAMP_PERIODS.every(
    (period) => rampPct[period.suffix] !== null && rampPct[period.suffix] !== undefined
  );
  const utilizationRamp: UtilizationRampUp | undefined = hasFullRamp
    ? {
        month1to3Pct: rampPct.month1to3 ?? 0,
        month4to6Pct: rampPct.month4to6 ?? 0,
        month7to12Pct: rampPct.month7to12 ?? 0,
        year2PlusPct: rampPct.year2Plus ?? 0,
      }
    : undefined;

  return {
    purchaseCost,
    installationCost,
    usagePerDay,
    workingDaysPerMonth: basic.workingDaysPerMonth ?? 25,
    payerMix: resolvePayerMix(state),
    variableCostPerUse:
      (basic.consumableCostPerUse ?? 0) +
      (basic.professionalFeePerUse ?? 0) +
      (basic.otherVariableCostPerUse ?? 0),
    fixedCostPerMonth:
      (basic.staffCostPerMonth ?? 0) +
      (basic.electricityCostPerMonth ?? 0) +
      (basic.otherFixedCostPerMonth ?? 0),
    financing,
    maintenance: {
      warrantyYears,
      cmcYears,
      cmcAnnualCost,
      amcAnnualCost,
      costByYearPct: advanced.E.maintenanceCostByYearPct,
    },
    usefulLifeYears,
    discountRate: advanced.F.discountRate ?? 12.5,
    salvageValuePercentage: advanced.F.salvageValuePercentage ?? 0,
    utilizationRamp,
  };
}
