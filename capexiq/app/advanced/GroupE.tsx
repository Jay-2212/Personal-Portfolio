"use client";

// Group E — Maintenance and lifecycle cost (SPEC.md §11.1 E).

import { AlertTriangle } from "lucide-react";
import { useWizard } from "../forms/WizardContext";
import { FieldRenderer } from "../components/FieldRenderer";
import { MaintenanceScheduleFields } from "./MaintenanceScheduleFields";

// Smart-input check (Jay's call, 2026-07-14): non-blocking — formulas/maintenance.ts's
// maintenanceScheduleForYears() doesn't crash on an oversized cmcYears (every
// remaining year just gets treated as CMC coverage), but the number itself is then
// inconsistent with warrantyYears/usefulLifeYears, so it's worth flagging rather than
// silently accepting.
function CmcYearsNotice() {
  const { state } = useWizard();
  const { warrantyYears } = state.basic;
  const { usefulLifeYears } = state.advanced.F;
  const { cmcYears } = state.advanced.E;
  if (warrantyYears === null || usefulLifeYears === null || cmcYears === null) return null;
  const postWarrantyYears = usefulLifeYears - warrantyYears;
  if (postWarrantyYears <= 0 || cmcYears <= postWarrantyYears) return null;
  return (
    <div className="smart-input-notice" role="status">
      <AlertTriangle aria-hidden="true" size={16} />
      <span>
        CMC coverage ({cmcYears} years) is longer than the post-warranty period (
        {postWarrantyYears} years = useful life minus warranty) — the extra years will still
        be treated as CMC coverage, worth double-checking these numbers.
      </span>
    </div>
  );
}

export function GroupE() {
  return (
    <fieldset className="advanced-group">
      <legend>E. Maintenance and lifecycle cost</legend>
      <FieldRenderer path="advanced.E.cmcYears" />
      <CmcYearsNotice />
      <MaintenanceScheduleFields />
      <FieldRenderer path="advanced.E.maintenanceInflationPct" />
      <FieldRenderer path="advanced.E.majorReplacementCost" />
    </fieldset>
  );
}
