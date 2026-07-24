// Deterministic, browser-safe raster charts shared by Excel and Word exports.
//
// The financial values are supplied by the canonical AssessmentResult. This module
// only paints those values; it does not calculate or reinterpret them. PNG encoding
// is dependency-free so the client-side export path does not need a DOM canvas or a
// Node-only graphics package.

const PNG_SIGNATURE = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10,
]);

interface Rgb {
  red: number;
  green: number;
  blue: number;
}

class Raster {
  readonly pixels: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    background: Rgb
  ) {
    this.pixels = new Uint8Array(width * height * 4);
    this.fillRect(0, 0, width, height, background);
  }

  fillRect(x: number, y: number, width: number, height: number, color: Rgb) {
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const endX = Math.min(this.width, Math.ceil(x + width));
    const endY = Math.min(this.height, Math.ceil(y + height));

    for (let row = startY; row < endY; row += 1) {
      for (let column = startX; column < endX; column += 1) {
        const offset = (row * this.width + column) * 4;
        this.pixels[offset] = color.red;
        this.pixels[offset + 1] = color.green;
        this.pixels[offset + 2] = color.blue;
        this.pixels[offset + 3] = 255;
      }
    }
  }
}

const COLORS = {
  background: { red: 255, green: 253, blue: 247 },
  grid: { red: 226, green: 217, blue: 204 },
  axis: { red: 89, green: 82, blue: 72 },
  positive: { red: 40, green: 122, blue: 98 },
  negative: { red: 183, green: 91, blue: 82 },
  caution: { red: 198, green: 132, blue: 47 },
  track: { red: 232, green: 225, blue: 214 },
} satisfies Record<string, Rgb>;

function uint32(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ]);
}

function concatenate(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0)
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStored(bytes: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  let offset = 0;

  while (offset < bytes.length) {
    const length = Math.min(65535, bytes.length - offset);
    const finalBlock = offset + length === bytes.length ? 1 : 0;
    parts.push(
      new Uint8Array([
        finalBlock,
        length & 255,
        (length >>> 8) & 255,
        (~length) & 255,
        ((~length) >>> 8) & 255,
      ]),
      bytes.slice(offset, offset + length)
    );
    offset += length;
  }

  parts.push(uint32(adler32(bytes)));
  return concatenate(parts);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatenate([typeBytes, data]);
  return concatenate([uint32(data.length), body, uint32(crc32(body))]);
}

function encodePng(raster: Raster): Uint8Array {
  const scanlines = new Uint8Array(
    raster.height * (1 + raster.width * 4)
  );
  const rowSize = 1 + raster.width * 4;
  for (let row = 0; row < raster.height; row += 1) {
    scanlines[row * rowSize] = 0;
    scanlines.set(
      raster.pixels.slice(
        row * raster.width * 4,
        (row + 1) * raster.width * 4
      ),
      row * rowSize + 1
    );
  }

  const header = new Uint8Array(13);
  header.set(uint32(raster.width), 0);
  header.set(uint32(raster.height), 4);
  header.set([8, 6, 0, 0, 0], 8);

  return concatenate([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlibStored(scanlines)),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function finiteValues(values: number[]): number[] {
  return values.map((value) => (Number.isFinite(value) ? value : 0));
}

export function cumulativeCashFlowChartPng(
  values: number[],
  width = 900,
  height = 360
): Uint8Array {
  const raster = new Raster(width, height, COLORS.background);
  const series = finiteValues(values);
  if (series.length === 0) return encodePng(raster);

  const inset = { left: 42, right: 22, top: 22, bottom: 34 };
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const minimum = Math.min(0, ...series);
  const maximum = Math.max(0, ...series);
  const span = maximum - minimum || 1;
  const yForValue = (value: number) =>
    inset.top + ((maximum - value) / span) * plotHeight;
  const zeroY = Math.round(yForValue(0));

  for (let line = 0; line <= 4; line += 1) {
    const y = inset.top + (line / 4) * plotHeight;
    raster.fillRect(inset.left, y, plotWidth, 1, COLORS.grid);
  }
  raster.fillRect(inset.left, zeroY - 1, plotWidth, 2, COLORS.axis);

  const slotWidth = plotWidth / series.length;
  const barWidth = Math.max(3, Math.min(42, slotWidth * 0.66));
  series.forEach((value, index) => {
    const valueY = yForValue(value);
    const top = Math.min(zeroY, valueY);
    const barHeight = Math.max(2, Math.abs(valueY - zeroY));
    const x = inset.left + index * slotWidth + (slotWidth - barWidth) / 2;
    raster.fillRect(
      x,
      top,
      barWidth,
      barHeight,
      value >= 0 ? COLORS.positive : COLORS.negative
    );
  });

  return encodePng(raster);
}

export function breakEvenChartPng(
  expectedUsagePerDay: number,
  breakEvenUsagePerDay: number | null,
  width = 900,
  height = 220
): Uint8Array {
  const raster = new Raster(width, height, COLORS.background);
  const expected = Number.isFinite(expectedUsagePerDay)
    ? Math.max(0, expectedUsagePerDay)
    : 0;
  const breakEven =
    breakEvenUsagePerDay !== null && Number.isFinite(breakEvenUsagePerDay)
      ? Math.max(0, breakEvenUsagePerDay)
      : null;
  const left = 48;
  const trackWidth = width - left * 2;
  const trackHeight = 34;
  const trackY = Math.round((height - trackHeight) / 2);
  const scaleMaximum = Math.max(expected, breakEven ?? 0, 1) * 1.15;

  raster.fillRect(left, trackY, trackWidth, trackHeight, COLORS.track);
  raster.fillRect(
    left,
    trackY,
    (expected / scaleMaximum) * trackWidth,
    trackHeight,
    breakEven !== null && expected >= breakEven
      ? COLORS.positive
      : COLORS.caution
  );

  if (breakEven === null) {
    raster.fillRect(left, trackY - 5, trackWidth, 3, COLORS.negative);
  } else {
    const markerX = left + (breakEven / scaleMaximum) * trackWidth;
    raster.fillRect(markerX - 2, trackY - 14, 4, trackHeight + 28, COLORS.axis);
    raster.fillRect(markerX - 7, trackY - 14, 14, 7, COLORS.axis);
  }

  return encodePng(raster);
}

export function bytesToDataUrl(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triplet = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    encoded += alphabet[(triplet >>> 18) & 63];
    encoded += alphabet[(triplet >>> 12) & 63];
    encoded += b === undefined ? "=" : alphabet[(triplet >>> 6) & 63];
    encoded += c === undefined ? "=" : alphabet[triplet & 63];
  }
  return `data:image/png;base64,${encoded}`;
}
