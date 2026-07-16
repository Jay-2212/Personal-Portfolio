// Regression test for this session's export-filename fix — the three exports used to
// share one hardcoded generic filename per format ("Financial Model.xlsx" etc.),
// which collided across equipment types (confirmed empirically: repeated Excel
// downloads landed in ~/Downloads as "Financial Model.xlsx" / "(1).xlsx"). See
// app/components/ExportPanel.tsx's buildExportFilename.

import { describe, expect, it } from "vitest";
import { buildExportFilename } from "../../app/components/ExportPanel";

describe("buildExportFilename", () => {
  it("includes hospital name, equipment type, and suffix", () => {
    const name = buildExportFilename("Sunrise Multispecialty Hospital", "MRI", "Financial Model", "xlsx");
    expect(name).toContain("Sunrise Multispecialty Hospital");
    expect(name).toContain("MRI");
    expect(name).toContain("Financial Model");
    expect(name).toMatch(/\.xlsx$/);
  });

  it("sanitizes filesystem-unsafe characters in the hospital name", () => {
    const name = buildExportFilename('St. Mary\'s Hospital / Trust: "North" <Wing>', "CT", "Proposal Report", "docx");
    expect(name).not.toMatch(/[/\\:*?"<>|]/);
  });

  it("falls back to just the equipment category when hospital name is blank", () => {
    const name = buildExportFilename("", "Dialysis", "CapexIQ Export", "zip");
    expect(name.startsWith("Dialysis")).toBe(true);
  });

  it("two exports on the same day for different equipment types don't collide", () => {
    const mri = buildExportFilename("Test Hospital", "MRI", "Financial Model", "xlsx");
    const ct = buildExportFilename("Test Hospital", "CT", "Financial Model", "xlsx");
    expect(mri).not.toBe(ct);
  });
});
