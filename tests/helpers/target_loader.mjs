/**
 * Target File Loader and Text Utilities
 * Loads live workspace files directly and calculates Princeton GEO word counts.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

export function getRepoPath(...segments) {
  return path.join(REPO_ROOT, ...segments);
}

export function fileExists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

export function readFile(relativePath) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath, "utf8");
}

export function loadTarget(filename) {
  const live = readFile(filename);
  if (live === null || live.trim().length === 0) {
    throw new Error(`Required repository target '${filename}' is missing or empty. Live production deliverable required.`);
  }
  return live;
}

/**
 * Backward compatibility alias that strictly returns live target content.
 * Never falls back to spec fixtures.
 */
export function getTargetOrSpec(filename) {
  return loadTarget(filename);
}

export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  // Replace markdown links [anchor](url) with just anchor text
  const noLinks = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Clean markdown markup and punctuation
  const cleaned = noLinks
    .replace(/[#*_`~>[\]()]/g, " ")
    .replace(/[.,;:!?"'“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function extractGeoAnswerBlocks(markdown) {
  if (!markdown || typeof markdown !== "string") return {};
  const blocks = {};
  const regex = /###\s+([^\n]+)\n+([\s\S]*?)(?=\n###|\n##|$)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks[match[1].trim()] = match[2].trim();
  }
  return blocks;
}
