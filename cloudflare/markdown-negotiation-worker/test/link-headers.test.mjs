import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const headersUrl = new URL("../../../_headers", import.meta.url);

test("static homepage fallback advertises only the approved registered relations", async () => {
  const headers = await readFile(headersUrl, "utf8");

  for (const relation of ["api-catalog", "service-desc", "service-doc", "describedby"]) {
    assert.match(headers, new RegExp(`rel=\\"${relation}\\"`));
  }

  assert.doesNotMatch(headers, /rel=\\"(?:agent-skills|mcp-server-card)\\"/);
});
