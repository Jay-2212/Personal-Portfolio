"use client";

// Phase 8 — SPEC.md §29.1's three export options. The generators are heavy
// (exceljs/docx/jszip), so they're dynamically imported inside each click handler
// rather than bundled into the initial page load (confirmed via a build-size spike:
// this route's own First Load JS stays untouched, the libraries land in separate
// lazy chunks fetched only on click). `inputs`/`result` are the exact objects the
// dashboard already computed — this component never recalculates anything
// (CONVENTIONS.md §3), it only calls the generators and triggers a browser download.

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { AssessmentInputs, AssessmentResult } from "@/formulas/computeAssessment";

type ExportKind = "excel" | "word" | "zip";

const LABELS: Record<ExportKind, string> = {
  excel: "Download Excel Model",
  word: "Download Word Proposal",
  zip: "Download ZIP Package",
};

function downloadBlob(bytes: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([bytes.slice()], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Filenames default to "Financial Model.xlsx" etc. with no hospital/equipment
// identity, so evaluating more than one equipment type produces indistinguishable,
// colliding downloads ("Financial Model (1).xlsx", "(2).xlsx", ...). Build one from
// the hospital name, equipment type, and today's date instead — sanitized for
// filesystem-unsafe characters (Windows/macOS both reject / \ : * ? " < > |).
export function buildExportFilename(
  hospitalName: string,
  equipmentCategory: string,
  suffix: string,
  extension: string
): string {
  const safeHospital = hospitalName.trim().replace(/[/\\:*?"<>|]/g, "-");
  const date = new Date().toISOString().slice(0, 10);
  const prefix = safeHospital ? `${safeHospital} — ${equipmentCategory}` : equipmentCategory;
  return `${prefix} — ${suffix} — ${date}.${extension}`;
}

export function ExportPanel({
  inputs,
  result,
  hospitalName,
  equipmentCategory,
  disabled = false,
}: {
  inputs: AssessmentInputs;
  result: AssessmentResult;
  hospitalName: string;
  equipmentCategory: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const context = { hospitalName, equipmentCategory };

  async function withPending(kind: ExportKind, run: () => Promise<void>) {
    setPending(kind);
    setError(null);
    try {
      await run();
    } catch {
      setError(`Could not generate the ${kind === "excel" ? "Excel model" : kind === "word" ? "Word proposal" : "ZIP package"}. Please try again.`);
    } finally {
      setPending(null);
    }
  }

  const handleExcel = () =>
    withPending("excel", async () => {
      const { generateExcelWorkbook } = await import("../../exports/excel-generator");
      const bytes = await generateExcelWorkbook(inputs, result, context);
      downloadBlob(
        bytes,
        buildExportFilename(hospitalName, equipmentCategory, "Financial Model", "xlsx"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    });

  const handleWord = () =>
    withPending("word", async () => {
      const { generateWordProposal } = await import("../../exports/word-generator");
      const bytes = await generateWordProposal(inputs, result, context);
      downloadBlob(
        bytes,
        buildExportFilename(hospitalName, equipmentCategory, "Proposal Report", "docx"),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });

  const handleZip = () =>
    withPending("zip", async () => {
      const [{ generateExcelWorkbook }, { generateWordProposal }, { generateExportZip }] = await Promise.all([
        import("../../exports/excel-generator"),
        import("../../exports/word-generator"),
        import("../../exports/zip-generator"),
      ]);
      const [excelBytes, wordBytes] = await Promise.all([
        generateExcelWorkbook(inputs, result, context),
        generateWordProposal(inputs, result, context),
      ]);
      const zipBytes = await generateExportZip(excelBytes, wordBytes);
      downloadBlob(
        zipBytes,
        buildExportFilename(hospitalName, equipmentCategory, "CapexIQ Export", "zip"),
        "application/zip"
      );
    });

  const buttons: [ExportKind, () => void][] = [
    ["excel", handleExcel],
    ["word", handleWord],
    ["zip", handleZip],
  ];

  return (
    <section className="export-panel">
      <div className="narrative-intro__eyebrow">Take it further</div>
      <h2>Export this assessment</h2>
      <p>
        The Excel model carries live formulas back to an Assumptions sheet — every downstream
        cell is traceable, not a pasted number.
      </p>
      <div className="export-panel__actions">
        {buttons.map(([kind, handler]) => (
          <button
            key={kind}
            type="button"
            className="button button--secondary"
            onClick={handler}
            disabled={disabled || pending !== null}
          >
            {pending === kind ? <Loader2 aria-hidden="true" size={16} className="export-panel__spinner" /> : <Download aria-hidden="true" size={16} />}
            {pending === kind ? "Preparing…" : LABELS[kind]}
          </button>
        ))}
      </div>
      {disabled && (
        <p className="export-panel__error" role="status">
          Fix the highlighted inputs to refresh the assessment before exporting.
        </p>
      )}
      {error && (
        <p className="export-panel__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
