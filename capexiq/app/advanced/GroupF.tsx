"use client";

// Group F — Financial model assumptions (SPEC.md §11.1 F). taxAssumptions and
// scenarioAssumptions are reserved/structural (not real controls in v1 — see
// content/inputs-metadata.json's own notes) and intentionally not rendered here.

import { AlertTriangle } from "lucide-react";
import { useWizard } from "../forms/WizardContext";
import { FieldRenderer } from "../components/FieldRenderer";

// Smart-input check (Jay's call, 2026-07-14): non-blocking — formulas/maintenance.ts
// doesn't crash on this (every year just falls in the warranty branch), but a
// warranty at or past the equipment's useful life means the post-warranty AMC/CMC
// rate the user entered on the Basic Costs step never actually applies, which is
// usually not what they intended.
function WarrantyVsUsefulLifeNotice() {
  const { state } = useWizard();
  const { warrantyYears } = state.basic;
  const { usefulLifeYears } = state.advanced.F;
  if (warrantyYears === null || usefulLifeYears === null) return null;
  if (warrantyYears !== usefulLifeYears) return null;
  return (
    <div className="smart-input-notice" role="status">
      <AlertTriangle aria-hidden="true" size={16} />
      <span>
        Warranty period ({warrantyYears} years) is the same as or longer than useful life (
        {usefulLifeYears} years) — the equipment would be retired before any post-warranty
        maintenance cost ever applies, worth double-checking these numbers.
      </span>
    </div>
  );
}

export function GroupF() {
  return (
    <fieldset className="advanced-group">
      <legend>F. Financial model assumptions</legend>
      <FieldRenderer path="advanced.F.discountRate" />
      <FieldRenderer path="advanced.F.targetIrr" />
      <FieldRenderer path="advanced.F.inflationRate" />
      <FieldRenderer path="advanced.F.usefulLifeYears" />
      <WarrantyVsUsefulLifeNotice />
      <FieldRenderer path="advanced.F.salvageValuePercentage" />
      <FieldRenderer path="advanced.F.priceEscalationPct" />
      <FieldRenderer path="advanced.F.costEscalationPct" />
    </fieldset>
  );
}
