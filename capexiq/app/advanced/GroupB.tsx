"use client";

// Group B — mature utilization and the operating ramp used by the cash-flow spine.

import { RAMP_PERIODS } from "../forms/payerAndRampKeys";
import { FieldRenderer } from "../components/FieldRenderer";

export function GroupB() {
  return (
    <fieldset className="advanced-group">
      <legend>B. Utilization ramp-up</legend>
      {RAMP_PERIODS.map((ramp) => (
        <FieldRenderer key={ramp.suffix} path={`advanced.B.utilizationRampPct.${ramp.suffix}`} />
      ))}
      <FieldRenderer path="advanced.B.expectedMatureUtilization" />
    </fieldset>
  );
}
