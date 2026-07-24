import { describe, expect, it } from "vitest";
import {
  breakEvenChartPng,
  bytesToDataUrl,
  cumulativeCashFlowChartPng,
} from "../../exports/chartImages";

function dimensions(png: Uint8Array): [number, number] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

describe("export chart images", () => {
  it("renders a deterministic cumulative-cash-flow PNG at the requested size", () => {
    const values = [-10_000_000, -4_000_000, 2_000_000, 9_000_000];
    const first = cumulativeCashFlowChartPng(values, 600, 240);
    const second = cumulativeCashFlowChartPng(values, 600, 240);

    expect(Array.from(first.slice(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(dimensions(first)).toEqual([600, 240]);
    expect(first).toEqual(second);
  });

  it("renders finite break-even and undefined-break-even states differently", () => {
    const finite = breakEvenChartPng(12, 8, 600, 150);
    const undefinedBreakEven = breakEvenChartPng(12, null, 600, 150);

    expect(dimensions(finite)).toEqual([600, 150]);
    expect(finite).not.toEqual(undefinedBreakEven);
  });

  it("encodes a valid PNG data URL without relying on browser globals", () => {
    const png = breakEvenChartPng(8, 10, 120, 60);
    const dataUrl = bytesToDataUrl(png);

    expect(dataUrl).toMatch(/^data:image\/png;base64,iVBORw0KGgo/);
  });
});
