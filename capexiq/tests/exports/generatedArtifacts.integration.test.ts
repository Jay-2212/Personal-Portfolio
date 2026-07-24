import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  computeAssessment,
  type AssessmentInputs,
} from "../../formulas/computeAssessment";
import { generateExcelWorkbook } from "../../exports/excel-generator";
import { generateWordProposal } from "../../exports/word-generator";
import { generateExportZip } from "../../exports/zip-generator";

const inputs: AssessmentInputs = {
  purchaseCost: 35_000_000,
  installationCost: 3_500_000,
  usagePerDay: 15,
  workingDaysPerMonth: 25,
  payerMix: [
    {
      payerName: "privateCash",
      shareOfVolume: 55,
      billedTariff: 5_500,
      realizationPercentage: 100,
      collectionDelayDays: 0,
    },
    {
      payerName: "insuranceTpa",
      shareOfVolume: 30,
      billedTariff: 5_000,
      realizationPercentage: 88,
      collectionDelayDays: 60,
    },
    {
      payerName: "corporateCredit",
      shareOfVolume: 15,
      billedTariff: 4_750,
      realizationPercentage: 92,
      collectionDelayDays: 45,
    },
  ],
  variableCostPerUse: 850,
  fixedCostPerMonth: 550_000,
  financing: {
    type: "loan",
    downPayment: 10_000_000,
    interestRate: 11.25,
    tenureMonths: 72,
    processingChargesPct: 1,
    emiStartMonth: 4,
    moratoriumPeriodMonths: 2,
  },
  maintenance: {
    warrantyYears: 1,
    cmcYears: 3,
    cmcAnnualCost: 1_400_000,
    amcAnnualCost: 850_000,
    inflationRate: 4,
    majorReplacementCost: 2_000_000,
  },
  usefulLifeYears: 10,
  discountRate: 12.5,
  salvageValuePercentage: 5,
  launchDelayMonths: 3,
  priceEscalationRate: 3,
  costEscalationRate: 4,
  targetIrr: 16.5,
};

describe("fresh generated export artifacts", () => {
  it("round-trips both chart-bearing documents and optionally writes QA files", async () => {
    const result = computeAssessment(inputs);
    const context = {
      hospitalName: "Fresh Validation Hospital",
      equipmentCategory: "MRI",
    };
    const excel = await generateExcelWorkbook(inputs, result, context);
    const word = await generateWordProposal(inputs, result, context);
    const bundle = await generateExportZip(excel, word);

    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(Buffer.from(excel) as any);
    expect(workbook.getWorksheet("Charts")!.getImages()).toHaveLength(2);

    const wordZip = await JSZip.loadAsync(word);
    expect(
      Object.keys(wordZip.files).filter(
        (name) => name.startsWith("word/media/") && !name.endsWith("/")
      )
    ).toHaveLength(2);

    const exportZip = await JSZip.loadAsync(bundle);
    expect(exportZip.file("Financial Model.xlsx")).not.toBeNull();
    expect(exportZip.file("Proposal Report.docx")).not.toBeNull();

    const outputDir = process.env.CAPEXIQ_EXPORT_QA_DIR;
    if (outputDir) {
      await fs.mkdir(outputDir, { recursive: true });
      await Promise.all([
        fs.writeFile(
          path.join(outputDir, "Fresh Validation MRI Financial Model.xlsx"),
          excel
        ),
        fs.writeFile(
          path.join(outputDir, "Fresh Validation MRI Proposal.docx"),
          word
        ),
        fs.writeFile(
          path.join(outputDir, "Fresh Validation MRI Package.zip"),
          bundle
        ),
      ]);
    }
  });
});
