/**
 * Tier 3: 12 Pairwise Cross-Feature Interaction Tests
 * Tests multi-module combinations across content, crawler directives, edge headers, and worker behavior.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
  extractGeoAnswerBlocks
} from "../helpers/target_loader.mjs";
import { parseJsonLdFromHtml, validateSchemaGraph } from "../helpers/schema_validator.mjs";
import { parseRobotsTxt, canFetch } from "../helpers/robots_validator.mjs";
import { parseSitemapXml } from "../helpers/xml_validator.mjs";
import { parseCloudflareHeaders } from "../helpers/headers_validator.mjs";
import { validateHtmlIntegrity } from "../helpers/html_guard.mjs";
import { handleRequest } from "../../cloudflare/markdown-negotiation-worker/src/index.js";

describe("Tier 3: Pairwise Combinatorial Feature Interactions", () => {
  // Test 3.1: F1 ↔ F3 (GEO Content & llms.txt Consistency)
  test("Pairwise 1: F1 ↔ F3 - Princeton GEO definition metrics align with llms.txt project descriptions", () => {
    const mdContent = readFile("index.md");
    assert.ok(mdContent, "index.md must exist");
    const geoBlocks = extractGeoAnswerBlocks(mdContent);
    const geoBio = geoBlocks["Who is Jay Bharti?"];
    const geoQualtech = geoBlocks["What is the QualTech Blood Bank DMAIC Study?"];
    const geoCapexiq = geoBlocks["What is CapexIQ?"];
    const llms = readFile("llms.txt");
    assert.ok(llms, "llms.txt must exist");

    assert.ok(geoBio.includes("8.88 CGPA"), "GEO bio must mention 8.88 CGPA");
    assert.ok(llms.includes("8.88 CGPA"), "llms.txt must mention 8.88 CGPA");

    assert.ok(geoQualtech.includes("95%"), "GEO QualTech must cite 95%");
    assert.ok(llms.includes("95%"), "llms.txt must cite 95%");

    assert.ok(geoCapexiq.includes("WebMCP"), "GEO CapexIQ must mention WebMCP");
    assert.ok(llms.includes("WebMCP"), "llms.txt must mention WebMCP");
  });

  // Test 3.2: F1 ↔ F10 (GEO Blocks & Worker Content Negotiation)
  test("Pairwise 2: F1 ↔ F10 - Markdown negotiation retrieves index.md containing Princeton GEO answer blocks", async () => {
    const markdownContent = readFile("index.md");
    assert.ok(markdownContent, "index.md must exist");
    const response = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: "text/markdown" } }),
      async (req) => {
        assert.equal(req.url, "https://jaybharti.me/index.md");
        return new Response(markdownContent, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8" }
        });
      }
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
    const body = await response.text();
    assert.ok(body.includes("Jay Bharti"), "Negotiated markdown must contain Jay Bharti");
    assert.ok(body.includes("QualTech"), "Negotiated markdown must contain QualTech");
  });

  // Test 3.3: F2 ↔ F8 (Schema.org JSON-LD & GSC Verification Hook)
  test("Pairwise 3: F2 ↔ F8 - Head contains both Schema.org JSON-LD graph and Google Site Verification hook", () => {
    const targetHtml = readFile("index.html");
    assert.ok(targetHtml, "index.html must exist");

    const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(targetHtml)[1];
    assert.ok(head.includes("application/ld+json"), "Head must contain JSON-LD");
    assert.ok(head.includes("google-site-verification"), "Head must contain Google Site Verification hook");
  });

  // Test 3.4: F2 ↔ F4 (Schema.org & Zero-Regression DOM Guard)
  test("Pairwise 4: F2 ↔ F4 - Rich Schema.org data coexists with unchanged visual layout and DOM section IDs", () => {
    const html = readFile("index.html");
    assert.ok(html, "index.html must exist");
    const guard = validateHtmlIntegrity(html);
    assert.ok(guard.criticalCssFound, "Critical CSS must be intact");
    assert.equal(guard.sectionsFound.length, 8, "All 8 core section IDs must be preserved");

    const jsonLdBlocks = parseJsonLdFromHtml(html);
    assert.ok(jsonLdBlocks.length > 0, "At least one JSON-LD block must be present");
  });

  // Test 3.5: F5 ↔ F6 (Robots.txt & Sitemap Consistency)
  test("Pairwise 5: F5 ↔ F6 - Robots.txt sitemap directive matches sitemap.xml canonical URLs without disallowing them", () => {
    const robotsRaw = readFile("robots.txt");
    assert.ok(robotsRaw, "robots.txt must exist");
    const parsedRobots = parseRobotsTxt(robotsRaw);

    const sitemapRaw = readFile("sitemap.xml");
    assert.ok(sitemapRaw, "sitemap.xml must exist");
    const parsedSitemap = parseSitemapXml(sitemapRaw);

    assert.ok(parsedRobots.sitemaps.length > 0, "Robots.txt must declare sitemap");
    const sitemapUrl = parsedRobots.sitemaps[0];
    assert.equal(sitemapUrl, "https://jaybharti.me/sitemap.xml");

    // Ensure none of the URLs in sitemap are disallowed for standard crawlers
    for (const entry of parsedSitemap.urls) {
      const urlPath = new URL(entry.loc).pathname;
      assert.ok(canFetch(parsedRobots, "Googlebot", urlPath), `Sitemap URL ${urlPath} must not be disallowed`);
    }
  });

  // Test 3.6: F6 ↔ F7 (Sitemap & IndexNow URL List)
  test("Pairwise 6: F6 ↔ F7 - IndexNow script urlList mirrors canonical URLs declared in sitemap.xml", () => {
    const sitemapRaw = readFile("sitemap.xml");
    assert.ok(sitemapRaw, "sitemap.xml must exist");
    const parsedSitemap = parseSitemapXml(sitemapRaw);
    const sitemapUrls = parsedSitemap.urls.map(u => u.loc);

    const scriptContent = readFile("scripts/ping_indexnow.sh");
    assert.ok(scriptContent, "scripts/ping_indexnow.sh must exist");

    assert.ok(sitemapUrls.includes("https://jaybharti.me/"), "Sitemap has root");
    assert.ok(sitemapUrls.includes("https://jaybharti.me/index.md"), "Sitemap has index.md");
    assert.ok(sitemapUrls.includes("https://jaybharti.me/llms.txt"), "Sitemap has llms.txt");

    assert.ok(scriptContent.includes("index.md"), "IndexNow includes index.md");
    assert.ok(scriptContent.includes("llms.txt"), "IndexNow includes llms.txt");
  });

  // Test 3.7: F9 ↔ F10 (Edge _headers & Worker Link Headers)
  test("Pairwise 7: F9 ↔ F10 - Worker injected Link headers match RFC 9727 relations declared in _headers", async () => {
    const headersRaw = readFile("_headers");
    assert.ok(headersRaw, "_headers must exist");
    const parsedHeaders = parseCloudflareHeaders(headersRaw);
    const rootRule = parsedHeaders.pathRules.get("/");
    const headersLinkVal = rootRule.get("link").values.join(", ");

    const res = await handleRequest(
      new Request("https://jaybharti.me/"),
      async () => new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html" } })
    );
    const workerLinkVal = res.headers.get("Link");

    const requiredRels = ["api-catalog", "service-desc", "service-doc", "describedby"];
    for (const rel of requiredRels) {
      assert.ok(headersLinkVal.includes(`rel="${rel}"`), `_headers missing rel="${rel}"`);
      assert.ok(workerLinkVal.includes(`rel="${rel}"`), `Worker Link missing rel="${rel}"`);
    }
  });

  // Test 3.8: F5 ↔ F9 (Robots.txt & Edge Caching)
  test("Pairwise 8: F5 ↔ F9 - Robots.txt allows AI crawlers while _headers sets 1-day SWR fresh caching", () => {
    const robotsRaw = readFile("robots.txt");
    assert.ok(robotsRaw, "robots.txt must exist");
    const parsedRobots = parseRobotsTxt(robotsRaw);

    assert.ok(canFetch(parsedRobots, "GPTBot", "/"), "GPTBot must be allowed");
    assert.ok(canFetch(parsedRobots, "PerplexityBot", "/"), "PerplexityBot must be allowed");

    const targetHeaders = readFile("_headers");
    assert.ok(targetHeaders, "_headers must exist");
    const parsedHeaders = parseCloudflareHeaders(targetHeaders);

    const robotsHeaders = parsedHeaders.pathRules.get("/robots.txt");
    assert.ok(robotsHeaders, "Missing /robots.txt rule");
    const cc = robotsHeaders.get("cache-control").values.join(", ");
    assert.ok(cc.includes("86400"), "Robots.txt must be cached for 1 day");
    assert.ok(cc.includes("stale-while-revalidate"), "Robots.txt must include stale-while-revalidate");
  });

  // Test 3.9: F3 ↔ F6 (llms.txt & Sitemap Inclusion)
  test("Pairwise 9: F3 ↔ F6 - Canonical discovery resources in llms.txt are fully indexed in sitemap.xml", () => {
    const llms = readFile("llms.txt");
    assert.ok(llms, "llms.txt must exist");
    const sitemapRaw = readFile("sitemap.xml");
    assert.ok(sitemapRaw, "sitemap.xml must exist");
    const parsedSitemap = parseSitemapXml(sitemapRaw);
    const sitemapLocs = new Set(parsedSitemap.urls.map(u => u.loc));

    assert.ok(sitemapLocs.has("https://jaybharti.me/"), "Sitemap has root");
    assert.ok(sitemapLocs.has("https://jaybharti.me/index.md"), "Sitemap has index.md");
    assert.ok(sitemapLocs.has("https://jaybharti.me/llms.txt"), "Sitemap has llms.txt");

    assert.ok(llms.includes("https://jaybharti.me/index.md"), "llms.txt references index.md");
    assert.ok(llms.includes("https://jaybharti.me/sitemap.xml"), "llms.txt references sitemap.xml");
  });

  // Test 3.10: F7 ↔ F11 (IndexNow Script & Cloudflare Crawler Hints)
  test("Pairwise 10: F7 ↔ F11 - IndexNow script URL endpoint aligns with Cloudflare Crawler Hints documentation", () => {
    const script = readFile("scripts/ping_indexnow.sh");
    assert.ok(script, "scripts/ping_indexnow.sh must exist");
    const guide = readFile("CLOUDFLARE_GUIDE.md");
    assert.ok(guide, "CLOUDFLARE_GUIDE.md must exist");

    assert.ok(script.includes("api.indexnow.org"), "Script targets IndexNow API");
    assert.ok(guide.includes("Crawler Hints"), "Guide documents Crawler Hints");
    assert.ok(guide.includes("IndexNow"), "Guide references IndexNow protocol");
  });

  // Test 3.11: F1 ↔ F2 (GEO Content & Schema.org Semantic Alignment)
  test("Pairwise 11: F1 ↔ F2 - Princeton GEO bio claims match Schema.org Person entity properties and credentials", () => {
    const html = readFile("index.html");
    assert.ok(html, "index.html must exist");
    const jsonLdBlocks = parseJsonLdFromHtml(html);
    const targetGraph = jsonLdBlocks.find(b => b["@graph"]);
    assert.ok(targetGraph, "index.html must contain JSON-LD @graph");
    const validation = validateSchemaGraph(targetGraph);
    const person = validation.nodesByType["Person"][0];

    assert.equal(person.name, "Jay Bharti");
    assert.ok(person.award.some(a => a.includes("QualTech")), "Person award must mention QualTech");
    assert.ok(person.alumniOf.some(a => a.name.includes("Manipal")), "Person alumniOf must mention Manipal");

    const mdContent = readFile("index.md");
    assert.ok(mdContent, "index.md must exist");
    const geoBlocks = extractGeoAnswerBlocks(mdContent);
    const geoBio = geoBlocks["Who is Jay Bharti?"];
    assert.ok(geoBio, "Who is Jay Bharti? block must exist");
    assert.ok(geoBio.includes("Jay Bharti"));
    assert.ok(geoBio.includes("MAHE"));
    assert.ok(geoBio.includes("QualTech"));
  });

  // Test 3.12: F4 ↔ F9 (HTML Zero-Regression & Static Asset Immutable Caching)
  test("Pairwise 12: F4 ↔ F9 - Inlined critical CSS and referenced static asset paths match immutable edge cache rules", () => {
    const html = readFile("index.html");
    assert.ok(html, "index.html must exist");
    assert.ok(html.includes("photos/"), "index.html references photos/");
    assert.ok(html.includes("assets/"), "index.html references assets/");

    const targetHeaders = readFile("_headers");
    assert.ok(targetHeaders, "_headers must exist");
    const parsedHeaders = parseCloudflareHeaders(targetHeaders);

    const photosCc = parsedHeaders.pathRules.get("/photos/*").get("cache-control").values.join(", ");
    const assetsCc = parsedHeaders.pathRules.get("/assets/*").get("cache-control").values.join(", ");

    assert.ok(photosCc.includes("immutable"), "/photos/* must be immutable");
    assert.ok(assetsCc.includes("immutable"), "/assets/* must be immutable");
  });
});
