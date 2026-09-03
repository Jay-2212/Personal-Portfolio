/**
 * Tier 4: 6 Real-World End-to-End Application Scenario Tests
 * Tests complete user, agent, and search crawler journeys across the entire system.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
  countWords,
  extractGeoAnswerBlocks
} from "../helpers/target_loader.mjs";
import { parseJsonLdFromHtml, validateSchemaGraph } from "../helpers/schema_validator.mjs";
import { parseRobotsTxt, canFetch, validateAiBotAllowance } from "../helpers/robots_validator.mjs";
import { parseSitemapXml, validateRequiredSitemapUrls } from "../helpers/xml_validator.mjs";
import { parseCloudflareHeaders, validateEdgeHeaders } from "../helpers/headers_validator.mjs";
import { validateHtmlIntegrity } from "../helpers/html_guard.mjs";
import { handleRequest } from "../../cloudflare/markdown-negotiation-worker/src/index.js";

describe("Tier 4: Real-World Application Scenarios", () => {
  // Scenario 1: AI Search Bot Discovery Crawl (Perplexity / SearchGPT Flow)
  test("Scenario 1: AI Search Bot Discovery Crawl (Perplexity / SearchGPT Flow)", async () => {
    // 1. Crawler inspects robots.txt
    const robotsRaw = readFile("robots.txt");
    assert.ok(robotsRaw, "robots.txt must exist");
    const parsedRobots = parseRobotsTxt(robotsRaw);
    assert.ok(canFetch(parsedRobots, "PerplexityBot", "/"), "PerplexityBot must be allowed to crawl /");
    assert.ok(canFetch(parsedRobots, "OAI-SearchBot", "/"), "OAI-SearchBot must be allowed to crawl /");

    // 2. Crawler discovers sitemap.xml
    assert.ok(parsedRobots.sitemaps.length > 0, "Crawler discovers sitemap.xml location");
    const sitemapRaw = readFile("sitemap.xml");
    assert.ok(sitemapRaw, "sitemap.xml must exist");
    const parsedSitemap = parseSitemapXml(sitemapRaw);
    const hasIndexMd = parsedSitemap.urls.some(u => u.loc.endsWith("/index.md"));
    assert.ok(hasIndexMd, "Sitemap points crawler to /index.md");

    // 3. Crawler negotiates markdown via Cloudflare Edge Worker
    const markdownContent = readFile("index.md");
    assert.ok(markdownContent, "index.md must exist");
    const edgeRes = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: "text/markdown" } }),
      async (req) => {
        assert.equal(req.url, "https://jaybharti.me/index.md");
        return new Response(markdownContent, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" }
        });
      }
    );
    assert.equal(edgeRes.status, 200);
    assert.equal(edgeRes.headers.get("Content-Type"), "text/markdown; charset=utf-8");

    // 4. Crawler extracts Princeton GEO answer blocks directly from negotiated markdown body
    const mdBody = await edgeRes.text();
    const blocks = extractGeoAnswerBlocks(mdBody);
    assert.ok(Object.keys(blocks).length >= 4, "Must extract at least 4 GEO answer blocks from response");
    for (const [blockName, blockText] of Object.entries(blocks)) {
      const words = countWords(blockText);
      assert.ok(words >= 40 && words <= 60, `Block ${blockName} meets GEO length bounds`);
    }

    // 5. Crawler reads llms.txt for canonical project citations
    const llms = readFile("llms.txt");
    assert.ok(llms, "llms.txt must exist");
    assert.ok(llms.includes("https://capexiq.jaybharti.me"), "Crawler extracts CapexIQ canonical URL");
    assert.ok(llms.includes("Sensum"), "Crawler extracts Sensum canonical URL");
  });

  // Scenario 2: Search Engine Indexing & Instant IndexNow Dispatch
  test("Scenario 2: Search Engine Indexing & Instant IndexNow Dispatch Flow", () => {
    // 1. Validate updated sitemap.xml
    const sitemapRaw = readFile("sitemap.xml");
    assert.ok(sitemapRaw, "sitemap.xml must exist");
    const parsedSitemap = parseSitemapXml(sitemapRaw);
    assert.ok(parsedSitemap.valid, "Sitemap must be valid XML");
    const reqCheck = validateRequiredSitemapUrls(parsedSitemap);
    assert.ok(reqCheck.passed, `Missing required sitemap URLs: ${reqCheck.missing.join(", ")}`);

    // 2. Validate Google Site Verification Hook in HTML
    const targetHtml = readFile("index.html");
    assert.ok(targetHtml, "index.html must exist");
    const guard = validateHtmlIntegrity(targetHtml);
    assert.ok(guard.verificationHookFound, "HTML must contain Google Site Verification meta tag in <head>");

    // 3. Prepare IndexNow notification payload
    const script = readFile("scripts/ping_indexnow.sh");
    assert.ok(script, "scripts/ping_indexnow.sh must exist");
    assert.ok(script.includes("https://api.indexnow.org/indexnow"), "Points to standard IndexNow API endpoint");
    assert.ok(script.includes("--dry-run"), "Supports safe dry-run validation");

    // 4. Validate key structure
    const keyMatch = /(?:DEFAULT_KEY|INDEXNOW_KEY:-?)="?([0-9a-fA-F]{8,})"?/.exec(script);
    assert.ok(keyMatch, "Script defines a default hex key");
    const key = keyMatch[1];
    assert.ok(key.length >= 8, "Key must be at least 8 chars");

    // 5. Verify Edge cache rules keep sitemap and robots fresh
    const targetHeaders = readFile("_headers");
    assert.ok(targetHeaders, "_headers must exist");
    const parsedHeaders = parseCloudflareHeaders(targetHeaders);
    const sitemapCc = parsedHeaders.pathRules.get("/sitemap.xml").get("cache-control").values.join(", ");
    assert.ok(sitemapCc.includes("86400") && sitemapCc.includes("stale-while-revalidate"), "Sitemap fresh caching enabled");
  });

  // Scenario 3: Knowledge Graph Entity Extraction (Google Rich Snippets / Bing)
  test("Scenario 3: Knowledge Graph Entity Extraction Flow", () => {
    // 1. Extract Schema.org JSON-LD from HTML
    const html = readFile("index.html");
    assert.ok(html, "index.html must exist");
    const jsonLdBlocks = parseJsonLdFromHtml(html);
    const targetGraph = jsonLdBlocks.find(b => b["@graph"]);
    assert.ok(targetGraph, "index.html must contain JSON-LD @graph");

    // 2. Validate unified @graph entity tree
    const validation = validateSchemaGraph(targetGraph);
    assert.ok(validation.valid, `Schema graph errors: ${validation.errors.join("; ")}`);

    // 3. Verify Person entity and disambiguation authorities
    const person = validation.nodesByType["Person"][0];
    assert.equal(person.name, "Jay Bharti");
    assert.ok(person.sameAs.some(u => u.includes("linkedin.com")), "Verified LinkedIn authority");
    assert.ok(person.sameAs.some(u => u.includes("github.com/Jay-2212")), "Verified GitHub authority");

    // 4. Verify Project entities (CapexIQ, Mac Orchestrator, Sensum, QualTech)
    const apps = validation.nodesByType["SoftwareApplication"] || [];
    assert.ok(apps.some(a => a.name === "CapexIQ"), "CapexIQ SoftwareApplication node present");
    assert.ok(validation.nodesByType["CreativeWork"].length >= 1, "QualTech CreativeWork node present");

    // 5. Verify DOM layout integrity (Zero-Regression)
    const guard = validateHtmlIntegrity(html);
    assert.ok(guard.criticalCssFound, "Critical CSS unaffected by structured data addition");
    assert.equal(guard.sectionsFound.length, 8, "All 8 core sections present in DOM");
  });

  // Scenario 4: Edge Content Negotiation for LLM Agents (text/markdown vs text/html)
  test("Scenario 4: Dual-Channel Edge Content Negotiation Flow", async () => {
    const originHtml = readFile("index.html");
    assert.ok(originHtml, "index.html must exist");
    const originMd = readFile("index.md");
    assert.ok(originMd, "index.md must exist");

    // Channel A: Standard Web Browser requesting text/html
    const browserRes = await handleRequest(
      new Request("https://jaybharti.me/", {
        headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
      }),
      async (req) => {
        assert.equal(req.url, "https://jaybharti.me/");
        return new Response(originHtml, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    );
    assert.equal(browserRes.status, 200);
    assert.equal(browserRes.headers.get("Content-Type"), "text/html; charset=utf-8");
    assert.ok(browserRes.headers.get("Link").includes('rel="describedby"'), "Browser response contains discovery Link header");

    // Channel B: AI Agent requesting text/markdown
    const agentRes = await handleRequest(
      new Request("https://jaybharti.me/", {
        headers: { Accept: "text/markdown; charset=utf-8" }
      }),
      async (req) => {
        assert.equal(req.url, "https://jaybharti.me/index.md");
        return new Response(originMd, {
          status: 200,
          headers: { "Content-Type": "text/markdown; charset=utf-8" }
        });
      }
    );
    assert.equal(agentRes.status, 200);
    assert.equal(agentRes.headers.get("Content-Type"), "text/markdown; charset=utf-8");
    assert.ok(agentRes.headers.get("Vary").includes("Accept"), "Agent response sets Vary: Accept");
    const negotiatedText = await agentRes.text();
    assert.ok(negotiatedText.includes("Jay Bharti"), "Agent receives structured markdown content");
  });

  // Scenario 5: Static Asset Caching & Core Web Vitals Delivery
  test("Scenario 5: Core Web Vitals Delivery & Static Asset Caching Flow", () => {
    // 1. Audit index.html critical rendering path
    const html = readFile("index.html");
    assert.ok(html, "index.html must exist");
    const guard = validateHtmlIntegrity(html);
    assert.ok(guard.criticalCssFound, "Critical CSS inlined in <head> eliminates render-blocking roundtrips");

    // 2. Audit images for Cumulative Layout Shift prevention
    assert.ok(guard.imageMetrics.dimensionedImages > 0, "Images specify explicit width/height to reserve aspect ratio");
    assert.ok(guard.imageMetrics.lazyImages > 0, "Off-screen images defer loading via loading='lazy'");

    // 3. Audit Cloudflare edge caching rules
    const targetHeaders = readFile("_headers");
    assert.ok(targetHeaders, "_headers must exist");
    const parsedHeaders = parseCloudflareHeaders(targetHeaders);

    const photosCc = parsedHeaders.pathRules.get("/photos/*").get("cache-control").values.join(", ");
    const assetsCc = parsedHeaders.pathRules.get("/assets/*").get("cache-control").values.join(", ");
    assert.ok(photosCc.includes("immutable") && photosCc.includes("31536000"), "/photos/* cached 1yr immutable");
    assert.ok(assetsCc.includes("immutable") && assetsCc.includes("31536000"), "/assets/* cached 1yr immutable");

    // 4. Audit global security headers
    const globalSecurity = parsedHeaders.pathRules.get("/*");
    assert.ok(globalSecurity.has("x-content-type-options"), "X-Content-Type-Options present");
    assert.ok(globalSecurity.has("x-frame-options"), "X-Frame-Options present");
    assert.ok(globalSecurity.has("referrer-policy"), "Referrer-Policy present");
  });

  // Scenario 6: Full Site Audit & Backward Compatibility Validation
  test("Scenario 6: Comprehensive Full Site Audit & Backward Compatibility", () => {
    // 1. Content extractability & GEO answer blocks (F1)
    const md = readFile("index.md");
    assert.ok(md, "index.md must exist");
    const geoBlocks = extractGeoAnswerBlocks(md);
    const bioText = geoBlocks["Who is Jay Bharti?"];
    assert.ok(bioText, "Bio answer block must exist");
    const bioWords = countWords(bioText);
    assert.ok(bioWords >= 40 && bioWords <= 60, "F1: Bio block length compliant");

    // 2. Schema.org graph (F2)
    const html = readFile("index.html");
    assert.ok(html, "index.html must exist");
    const jsonLdBlocks = parseJsonLdFromHtml(html);
    const targetGraph = jsonLdBlocks.find(b => b["@graph"]);
    assert.ok(targetGraph, "index.html must contain @graph");
    const schemaValidation = validateSchemaGraph(targetGraph);
    assert.ok(schemaValidation.valid, "F2: Schema.org graph valid");

    // 3. llms.txt format (F3)
    const llms = readFile("llms.txt");
    assert.ok(llms, "llms.txt must exist");
    assert.ok(llms.includes("CapexIQ") && llms.includes("Sensum"), "F3: llms.txt projects present");

    // 4. Zero-regression HTML (F4)
    const htmlGuard = validateHtmlIntegrity(html);
    assert.equal(htmlGuard.sectionsFound.length, 8, "F4: DOM layout intact");

    // 5. Modernized robots.txt (F5)
    const robotsRaw = readFile("robots.txt");
    assert.ok(robotsRaw, "robots.txt must exist");
    const robotsParsed = parseRobotsTxt(robotsRaw);
    assert.ok(robotsParsed.valid, "F5: robots.txt RFC 9309 compliant");

    // 6. Accurate sitemap.xml (F6)
    const sitemapRaw = readFile("sitemap.xml");
    assert.ok(sitemapRaw, "sitemap.xml must exist");
    const sitemapParsed = parseSitemapXml(sitemapRaw);
    assert.ok(sitemapParsed.valid, "F6: sitemap.xml schema compliant");

    // 7. Automated IndexNow (F7)
    const script = readFile("scripts/ping_indexnow.sh");
    assert.ok(script, "scripts/ping_indexnow.sh must exist");
    assert.ok(script.includes("api.indexnow.org"), "F7: IndexNow script configured");

    // 8. Google Site Verification Hook (F8)
    assert.ok(html.includes("google-site-verification"), "F8: GSC verification hook supported");

    // 9. Edge _headers (F9)
    const targetHeaders = readFile("_headers");
    assert.ok(targetHeaders, "_headers must exist");
    const headersParsed = parseCloudflareHeaders(targetHeaders);
    const headersValidation = validateEdgeHeaders(headersParsed);
    assert.ok(headersValidation.valid, "F9: Edge headers compliant");

    // 10. Worker Continuity (F10)
    assert.ok(typeof handleRequest === "function", "F10: Worker entry point exported");

    // 11. Documentation (F11)
    const guide = readFile("CLOUDFLARE_GUIDE.md");
    assert.ok(guide, "CLOUDFLARE_GUIDE.md must exist");
    assert.ok(guide.includes("Crawler Hints"), "F11: Guide documentation complete");

    // 12. Verification runner (F12)
    const makefile = readFile("Makefile");
    assert.ok(makefile && makefile.includes("verify:"), "F12: Makefile verify target present");
  });
});
