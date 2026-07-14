"use client";

// Smart-input cross-field check (Jay's call, 2026-07-14): consumable + professional
// fee + other variable cost per use is the same variableCostPerUse
// toAssessmentInputs.ts sums and compares against billedTariffPerUse downstream — this
// surfaces that same comparison right where the three cost fields live, before the
// user ever reaches Results. Deliberately a non-blocking notice, not a validation
// error: a loss-making procedure is a legitimate (if bad) scenario this tool exists to
// reveal, so it must stay reachable, not gated.

import { AlertTriangle } from "lucide-react";
import { useWizard } from "../forms/WizardContext";
import { formatInr } from "./formatting";

export function CostMarginNotice() {
  const { state } = useWizard();
  const { basic } = state;

  if (basic.billedTariffPerUse === null) return null;

  const variableCostPerUse =
    (basic.consumableCostPerUse ?? 0) +
    (basic.professionalFeePerUse ?? 0) +
    (basic.otherVariableCostPerUse ?? 0);

  if (variableCostPerUse <= basic.billedTariffPerUse) return null;

  const shortfall = variableCostPerUse - basic.billedTariffPerUse;

  return (
    <div className="smart-input-notice" role="status">
      <AlertTriangle aria-hidden="true" size={16} />
      <span>
        Your per-use costs ({formatInr(variableCostPerUse)}) are {formatInr(shortfall)} more
        than what you bill per use ({formatInr(basic.billedTariffPerUse)}). Every procedure
        would run at a loss before fixed costs — worth double-checking these numbers, though
        you can still continue.
      </span>
    </div>
  );
}
