// SPEC.md §29 / Phase 8. Writes exports/workbookPlan.ts's plan into a real .xlsx via
// exceljs — the plan itself is the tested artifact (tests/exports/workbookPlan.test.ts
// evaluates every formula cell through HyperFormula and checks it against
// computeAssessment()/buildMonthlySeries()'s own numbers); this file's only job is a
// mechanical write of that already-verified plan, so it stays intentionally thin.
//
import ExcelJS from "exceljs";
import type { AssessmentInputs, AssessmentResult } from "../formulas/computeAssessment";
import { buildMonthlySeries } from "../formulas/monthlySeries";
import { cumulativeCashFlowSeries } from "../formulas/roi";
import {
  breakEvenChartPng,
  bytesToDataUrl,
  cumulativeCashFlowChartPng,
} from "./chartImages";
import { buildWorkbookPlan } from "./workbookPlan";

const INR_NUMBER_FORMAT =
  "[$₹-en-IN]#,##,##0;[Red]-[$₹-en-IN]#,##,##0";
const WHOLE_NUMBER_FORMAT = "#,##,##0";
const ONE_DECIMAL_FORMAT = "#,##,##0.0";
const PERCENT_VALUE_FORMAT = "0.0";
const PERCENT_FRACTION_FORMAT = "0.0%";

function applyNumberFormats(workbook: ExcelJS.Workbook) {
  const assumptions = workbook.getWorksheet("Assumptions");
  assumptions?.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const label = String(row.getCell(1).value ?? "");
    const valueCell = row.getCell(2);
    if (
      /%|rate|salvage|ramp|inflation|escalation|realization|share/i.test(
        label
      )
    ) {
      valueCell.numFmt = PERCENT_VALUE_FORMAT;
    } else if (
      /cost|outlay|principal|payment|rental|tariff|buffer|replacement|charges|interest/i.test(
        label
      )
    ) {
      valueCell.numFmt = INR_NUMBER_FORMAT;
    } else if (/usage/i.test(label)) {
      valueCell.numFmt = ONE_DECIMAL_FORMAT;
    } else if (/month|year|life|delay|tenure|warranty|CMC/i.test(label)) {
      valueCell.numFmt = WHOLE_NUMBER_FORMAT;
    }
  });

  const monthly = workbook.getWorksheet("Monthly");
  if (monthly) {
    monthly.getColumn("A").numFmt = WHOLE_NUMBER_FORMAT;
    monthly.getColumn("B").numFmt = WHOLE_NUMBER_FORMAT;
    monthly.getColumn("D").numFmt = PERCENT_FRACTION_FORMAT;
    for (const column of ["C", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"]) {
      monthly.getColumn(column).numFmt = INR_NUMBER_FORMAT;
    }
  }

  const annual = workbook.getWorksheet("Annual Summary");
  if (annual) {
    annual.getColumn("A").numFmt = WHOLE_NUMBER_FORMAT;
    for (const column of ["B", "C", "D", "E", "F", "G"]) {
      annual.getColumn(column).numFmt = INR_NUMBER_FORMAT;
    }
    annual.eachRow((row) => {
      const label = String(row.getCell("A").value ?? "");
      if (label === "NPV") row.getCell("B").numFmt = INR_NUMBER_FORMAT;
      if (label === "IRR") row.getCell("B").numFmt = PERCENT_FRACTION_FORMAT;
    });
  }

  const breakEven = workbook.getWorksheet("Break-even Analysis");
  if (breakEven) {
    breakEven.getCell("B1").numFmt = INR_NUMBER_FORMAT;
    breakEven.getCell("B2").numFmt = ONE_DECIMAL_FORMAT;
    breakEven.getCell("B3").numFmt = ONE_DECIMAL_FORMAT;
  }

  const maintenance = workbook.getWorksheet("Maintenance Schedule");
  if (maintenance) {
    maintenance.getColumn("A").numFmt = WHOLE_NUMBER_FORMAT;
    maintenance.getColumn("C").numFmt = INR_NUMBER_FORMAT;
  }

  const charts = workbook.getWorksheet("Charts");
  if (charts) {
    charts.getColumn("A").numFmt = WHOLE_NUMBER_FORMAT;
    charts.getColumn("B").numFmt = INR_NUMBER_FORMAT;
    charts.getColumn("D").numFmt = ONE_DECIMAL_FORMAT;
    charts.getColumn("E").numFmt = ONE_DECIMAL_FORMAT;
  }
}

export async function generateExcelWorkbook(
  inputs: AssessmentInputs,
  result: AssessmentResult,
  context?: { hospitalName: string; equipmentCategory: string }
): Promise<Uint8Array> {
  const monthly = buildMonthlySeries(inputs);
  const plan = buildWorkbookPlan(inputs, result, monthly, context);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CapexIQ";
  workbook.created = new Date();
  if (context?.hospitalName) {
    workbook.title = `${context.hospitalName} — ${context.equipmentCategory} Financial Model`;
    workbook.subject = context.equipmentCategory;
  }

  const sheets = new Map<string, ExcelJS.Worksheet>();
  for (const name of plan.sheetOrder) {
    sheets.set(name, workbook.addWorksheet(name));
  }

  for (const cell of plan.cells) {
    const sheet = sheets.get(cell.sheet);
    if (!sheet) continue;
    const target = sheet.getCell(cell.address);
    if (cell.formula !== undefined) {
      target.value = { formula: cell.formula } as ExcelJS.CellFormulaValue;
    } else {
      target.value = cell.value ?? null;
    }
  }

  for (const sheet of sheets.values()) {
    sheet.getColumn(1).width = 26;
    for (let col = 2; col <= 16; col += 1) sheet.getColumn(col).width = 16;
    sheet.getRow(1).font = { bold: true };
  }
  applyNumberFormats(workbook);

  const charts = workbook.getWorksheet("Charts");
  if (charts) {
    const cashFlowPng = cumulativeCashFlowChartPng(
      cumulativeCashFlowSeries(
        result.initialInvestment,
        result.annualNetCashFlowsAfterFinancing
      )
    );
    const breakEvenPng = breakEvenChartPng(
      inputs.usagePerDay,
      result.breakEvenUsagePerDay
    );
    const cashFlowImageId = workbook.addImage({
      base64: bytesToDataUrl(cashFlowPng),
      extension: "png",
    });
    const breakEvenImageId = workbook.addImage({
      base64: bytesToDataUrl(breakEvenPng),
      extension: "png",
    });

    charts.getCell("G1").value = "Cumulative cash position — export snapshot";
    charts.getCell("G18").value = "Expected usage versus break-even — export snapshot";
    charts.getCell("G1").font = { bold: true, size: 12 };
    charts.getCell("G18").font = { bold: true, size: 12 };
    charts.getCell("G16").value =
      "Green = positive; red = negative. Source table remains live.";
    charts.getCell("G28").value =
      result.breakEvenUsagePerDay === null
        ? "Break-even is undefined because contribution per use is not positive."
        : "Dark marker = break-even; fill = expected usage.";
    charts.getCell("G16").font = {
      italic: true,
      size: 9,
      color: { argb: "FF6F675D" },
    };
    charts.getCell("G28").font = {
      italic: true,
      size: 9,
      color: { argb: "FF6F675D" },
    };
    charts.mergeCells("G1:N1");
    charts.mergeCells("G16:N16");
    charts.mergeCells("G18:N18");
    charts.mergeCells("G28:N28");
    for (let column = 7; column <= 14; column += 1) {
      charts.getColumn(column).width = 14;
    }
    charts.addImage(cashFlowImageId, {
      tl: { col: 6, row: 1 },
      ext: { width: 720, height: 288 },
      editAs: "oneCell",
    });
    charts.addImage(breakEvenImageId, {
      tl: { col: 6, row: 18 },
      ext: { width: 720, height: 176 },
      editAs: "oneCell",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
