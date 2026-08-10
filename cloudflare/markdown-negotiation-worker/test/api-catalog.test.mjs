import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalogUrl = new URL("../../../.well-known/api-catalog", import.meta.url);
const descriptionUrl = new URL("../../../.well-known/portfolio-api.json", import.meta.url);

test("publishes the portfolio API as an RFC 9727 Linkset", async () => {
  const catalog = JSON.parse(await readFile(catalogUrl, "utf8"));

  assert.ok(Array.isArray(catalog.linkset));
  assert.equal(catalog.linkset.length, 1);
  const [entry] = catalog.linkset;
  assert.equal(entry.anchor, "https://jaybharti.me/");
  assert.equal(entry["service-desc"][0].href, "https://jaybharti.me/.well-known/portfolio-api.json");
  assert.equal(entry["service-desc"][0].type, "application/vnd.oai.openapi+json");
  assert.equal(entry["service-doc"][0].href, "https://jaybharti.me/");
  assert.equal(entry["service-doc"][0].type, "text/html");
});

test("publishes a valid OpenAPI description for the catalogued root endpoint", async () => {
  const description = JSON.parse(await readFile(descriptionUrl, "utf8"));

  assert.equal(description.openapi, "3.1.0");
  assert.equal(description.info.title, "Jay Bharti Portfolio Profile API");
  assert.equal(description.servers[0].url, "https://jaybharti.me");
  assert.ok(description.paths["/"].get);
});
