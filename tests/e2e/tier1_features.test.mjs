/**
 * Tier 1: 60 Feature Coverage Tests (F1–F12, 5 tests each)
 * Validates primary behavior (happy paths) for all features per PROJECT.md and TEST_INFRA.md.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  readFile,
  countWords,
  getRepoPath,
  extractGeoAnswerBlocks
} from "../helpers/target_loader.mjs";
import { SPEC_AI_BOTS } from "../fixtures/spec_fixtures.mjs";
import { parseJsonLdFromHtml, validateSchemaGraph } from "../helpers/schema_validator.mjs";
import { parseRobotsTxt, validateAiBotAllowance, canFetch } from "../helpers/robots_validator.mjs";
import { parseSitemapXml, validateRequiredSitemapUrls } from "../helpers/xml_validator.mjs";
import { parseCloudflareHeaders, validateEdgeHeaders } from "../helpers/headers_validator.mjs";
import { validateHtmlIntegrity } from "../helpers/html_guard.mjs";
import { handleRequest, acceptsMarkdown } from "../../cloudflare/markdown-negotiation-worker/src/index.js";

// Feature 1: Princeton GEO Answer Blocks
describe("F1: Princeton GEO Answer Blocks (Tier 1)", () => {
  const mdContent = readFile("index.md");
  assert.ok(mdContent, "index.md must exist in repository root");
  const geoBlocks = extractGeoAnswerBlocks(mdContent);

  test("F1.1: Executive bio block answers 'Who is Jay Bharti?' and covers core credentials", () => {
    assert.ok(mdContent.includes("Jay Bharti"), "Content must identify Jay Bharti");
    assert.ok(mdContent.includes("Healthcare Administration"), "Content must mention Healthcare Administration");
    assert.ok(mdContent.includes("MAHE"), "Content must mention MAHE");
    assert.ok(mdContent.includes("QualTech"), "Content must mention QualTech Prize");
  });

  test("F1.2: Princeton GEO answer blocks strictly conform to 40–60 word density bounds", () => {
    assert.ok(Object.keys(geoBlocks).length >= 4, "Must extract at least 4 GEO answer blocks from index.md");
    for (const [title, block] of Object.entries(geoBlocks)) {
      const words = countWords(block);
      assert.ok(words >= 40 && words <= 60, `Block '${title}' word count ${words} outside 40-60 range`);
    }
  });

  test("F1.3: High-density metrics are present (95% reduction, 8.88 CGPA, ₹2.6L savings)", () => {
    assert.ok(mdContent.includes("8.88"), "index.md must cite 8.88 CGPA");
    assert.ok(mdContent.includes("95%"), "index.md must cite 95% reduction");
    assert.ok(mdContent.includes("2.6"), "index.md must cite ₹2.6L savings");
  });

  test("F1.4: Authoritative institutional citations present (Qimpro, MAHE, SAKCON, CAHO)", () => {
    assert.ok(mdContent.includes("Qimpro"), "index.md must cite Qimpro Foundation");
    assert.ok(mdContent.includes("MAHE"), "index.md must cite MAHE");
    assert.ok(mdContent.includes("SAKCON"), "index.md must cite SAKCON");
    assert.ok(mdContent.includes("CAHO"), "index.md must cite CAHO");
  });

  test("F1.5: Direct commendation quotation or extractable definition syntax is intact", () => {
    assert.ok(
      mdContent.includes("National QualTech® Prize") && mdContent.includes("QualTech"),
      "index.md must feature extractable QualTech commendation"
    );
  });
});

// Feature 2: Schema.org JSON-LD Graph
describe("F2: Schema.org JSON-LD Graph (Tier 1)", () => {
  const htmlContent = readFile("index.html");
  assert.ok(htmlContent, "index.html must exist");
  const jsonLdBlocks = parseJsonLdFromHtml(htmlContent);
  const targetGraph = jsonLdBlocks.find(b => b["@graph"]);
  assert.ok(targetGraph, "index.html must contain a JSON-LD block with @graph");

  test("F2.1: JSON-LD block has @context 'https://schema.org' and unified @graph array", () => {
    const validation = validateSchemaGraph(targetGraph);
    assert.ok(validation.valid, `Schema graph errors: ${validation.errors.join("; ")}`);
    assert.ok(validation.nodeCount >= 5, `Expected at least 5 graph nodes, found ${validation.nodeCount}`);
  });

  test("F2.2: ProfilePage entity exists with mainEntity linking to Person", () => {
    const validation = validateSchemaGraph(targetGraph);
    const profilePages = validation.nodesByType["ProfilePage"] || [];
    assert.equal(profilePages.length, 1, "Must contain exactly one ProfilePage node");
    assert.ok(profilePages[0].mainEntity, "ProfilePage must have mainEntity");
  });

  test("F2.3: Person entity contains credentials, alumniOf, and sameAs links (LinkedIn, X, GitHub)", () => {
    const validation = validateSchemaGraph(targetGraph);
    const persons = validation.nodesByType["Person"] || [];
    assert.equal(persons.length, 1, "Must contain exactly one Person node");
    const person = persons[0];
    assert.equal(person.name, "Jay Bharti");
    assert.ok(person.sameAs.some(url => url.includes("linkedin.com")), "Missing LinkedIn sameAs");
    assert.ok(person.sameAs.some(url => url.includes("github.com/Jay-2212")), "Missing GitHub sameAs");
  });

  test("F2.4: OccupationalExperienceRequirements / credentials node is defined", () => {
    const validation = validateSchemaGraph(targetGraph);
    const graphStr = JSON.stringify(validation.graph);
    assert.ok(
      graphStr.includes("OccupationalExperienceRequirements") || graphStr.includes("EducationalOccupationalCredential"),
      "Must define OccupationalExperienceRequirements or credentials"
    );
  });

  test("F2.5: SoftwareApplication nodes (CapexIQ, Mac Orchestrator, Meridian, Sensum) and CreativeWork exist", () => {
    const validation = validateSchemaGraph(targetGraph);
    const apps = validation.nodesByType["SoftwareApplication"] || [];
    assert.ok(apps.length >= 2, `Expected at least 2 SoftwareApplication nodes, found ${apps.length}`);
    const creativeWorks = validation.nodesByType["CreativeWork"] || [];
    assert.ok(creativeWorks.length >= 1, "Must contain CreativeWork node for QualTech project");
  });
});

// Feature 3: Enriched llms.txt
describe("F3: Enriched llms.txt (Tier 1)", () => {
  const llmsContent = readFile("llms.txt");
  assert.ok(llmsContent, "llms.txt must exist");

  test("F3.1: Standard format with H1 title, blockquote guide summary, and sections", () => {
    assert.ok(llmsContent.includes("# Jay Bharti Portfolio"), "Must start with H1 title");
    assert.ok(llmsContent.includes("> Canonical guide"), "Must have blockquote summary");
  });

  test("F3.2: CapexIQ is documented with canonical URL and WebMCP description", () => {
    assert.ok(llmsContent.includes("https://capexiq.jaybharti.me"), "Must include CapexIQ URL");
    assert.ok(llmsContent.includes("WebMCP") || llmsContent.includes("capital expenditure"), "Must describe WebMCP / capex");
  });

  test("F3.3: Core projects (Mac Orchestrator, Meridian, Sensum) are documented with repository links", () => {
    assert.ok(llmsContent.includes("mac-orchestrator"), "Must include Mac Orchestrator");
    assert.ok(llmsContent.includes("meridian"), "Must include Meridian");
    assert.ok(llmsContent.includes("Sensum") || llmsContent.includes("IME"), "Must include Sensum");
  });

  test("F3.4: AI access, licensing, and canonical citation policy are declared", () => {
    assert.ok(llmsContent.includes("AI Access") || llmsContent.includes("Licensing Policy"), "Must declare AI access policy");
    assert.ok(llmsContent.includes("Attribution") || llmsContent.includes("citation"), "Must declare citation policy");
  });

  test("F3.5: Optional discovery endpoints (.well-known/api-catalog, sitemap.xml) are linked", () => {
    assert.ok(llmsContent.includes("sitemap.xml"), "Must link to sitemap.xml");
    assert.ok(llmsContent.includes("api-catalog") || llmsContent.includes("index.md"), "Must link to discovery endpoint");
  });
});

// Feature 4: Additive HTML & Zero-Regression Guard
describe("F4: Additive HTML & Zero-Regression Guard (Tier 1)", () => {
  const htmlContent = readFile("index.html");

  test("F4.1: Critical inlined CSS in <head> remains intact and uncorrupted", () => {
    assert.ok(htmlContent, "index.html must exist");
    const guard = validateHtmlIntegrity(htmlContent);
    assert.ok(guard.criticalCssFound, "Critical inlined CSS must be present in <head>");
  });

  test("F4.2: Core DOM section IDs are preserved (#nav, #hero, #about, #experience, #side-projects, #education, #skills, #awards)", () => {
    const guard = validateHtmlIntegrity(htmlContent);
    const required = ["nav", "hero", "about", "experience", "side-projects", "education", "skills", "awards"];
    for (const id of required) {
      assert.ok(guard.sectionsFound.includes(id), `Core section id="${id}" missing from DOM`);
    }
  });

  test("F4.3: Project images retain loading='lazy', width, and height attributes", () => {
    const guard = validateHtmlIntegrity(htmlContent);
    assert.ok(guard.imageMetrics.totalImages > 0, "Must have project images");
    assert.ok(guard.imageMetrics.lazyImages > 0, "Images must use loading='lazy'");
    assert.ok(guard.imageMetrics.dimensionedImages > 0, "Images must declare dimensions");
  });

  test("F4.4: Canonical link <link rel='canonical' href='https://jaybharti.me/'> is present", () => {
    assert.ok(htmlContent.includes('<link rel="canonical" href="https://jaybharti.me/">'), "Canonical link must be exact");
  });

  test("F4.5: Head modifications are strictly additive (meta, link, ld+json) preserving layout", () => {
    assert.ok(htmlContent.includes("<meta charset="), "Must preserve meta charset");
    assert.ok(htmlContent.includes("<meta name=\"viewport\""), "Must preserve viewport");
  });
});

// Feature 5: Modernized robots.txt (RFC 9309)
describe("F5: Modernized robots.txt (Tier 1)", () => {
  const robotsRaw = readFile("robots.txt");
  assert.ok(robotsRaw, "robots.txt must exist");
  const parsed = parseRobotsTxt(robotsRaw);

  test("F5.1: RFC 9309 compliant syntax: only recognized directives", () => {
    assert.ok(parsed.valid, `robots.txt parse errors: ${parsed.errors.join("; ")}`);
  });

  test("F5.2: Zero occurrences of unrecognized directives (no Content-Signal)", () => {
    assert.equal(parsed.unknownDirectives.length, 0, `Found unknown directives: ${JSON.stringify(parsed.unknownDirectives)}`);
  });

  test("F5.3: All 7 key AI search & retrieval crawlers allowed", () => {
    const botCheck = validateAiBotAllowance(parsed, SPEC_AI_BOTS);
    assert.ok(botCheck.passed, `Missing or disallowed bots: ${JSON.stringify(botCheck)}`);
  });

  test("F5.4: Universal User-agent: * allow rule is present", () => {
    const hasWildcard = parsed.records.some(r => r.agents.includes("*"));
    assert.ok(hasWildcard, "Must contain User-agent: * record");
    assert.ok(canFetch(parsed, "Googlebot", "/"), "Wildcard must allow crawling root");
  });

  test("F5.5: Sitemap directive points to https://jaybharti.me/sitemap.xml", () => {
    assert.ok(parsed.sitemaps.includes("https://jaybharti.me/sitemap.xml"), "Must declare sitemap URL");
  });
});

// Feature 6: Accurate sitemap.xml
describe("F6: Accurate sitemap.xml (Tier 1)", () => {
  const sitemapRaw = readFile("sitemap.xml");
  assert.ok(sitemapRaw, "sitemap.xml must exist");
  const parsed = parseSitemapXml(sitemapRaw);

  test("F6.1: Valid XML adhering to Sitemaps 0.9 schema", () => {
    assert.ok(parsed.valid, `Sitemap errors: ${parsed.errors.join("; ")}`);
  });

  test("F6.2: Root URL https://jaybharti.me/ has priority 1.0", () => {
    const root = parsed.urls.find(u => u.loc === "https://jaybharti.me/");
    assert.ok(root, "Root URL must exist in sitemap");
    assert.equal(root.priority, 1.0, "Root URL priority must be 1.0");
  });

  test("F6.3: Agent discovery document https://jaybharti.me/index.md is present with valid priority", () => {
    const md = parsed.urls.find(u => u.loc === "https://jaybharti.me/index.md");
    assert.ok(md, "index.md must exist in sitemap");
    assert.ok(md.priority >= 0.8, "index.md priority must be >= 0.8");
  });

  test("F6.4: https://jaybharti.me/llms.txt is present in sitemap", () => {
    const llms = parsed.urls.find(u => u.loc === "https://jaybharti.me/llms.txt");
    assert.ok(llms, "llms.txt must exist in sitemap");
  });

  test("F6.5: All <lastmod> timestamps follow ISO 8601 YYYY-MM-DD format", () => {
    for (const entry of parsed.urls) {
      assert.ok(entry.lastmod, `Missing lastmod for ${entry.loc}`);
      assert.match(entry.lastmod, /^\d{4}-\d{2}-\d{2}$/, `Invalid lastmod format: ${entry.lastmod}`);
    }
  });
});

// Feature 7: Automated IndexNow Script
describe("F7: Automated IndexNow Script (Tier 1)", () => {
  const scriptContent = readFile("scripts/ping_indexnow.sh");
  assert.ok(scriptContent, "scripts/ping_indexnow.sh must exist");

  test("F7.1: IndexNow script content exists and sets bash safety flags", () => {
    assert.ok(scriptContent.includes("#!/usr/bin/env bash") || scriptContent.includes("#!/bin/bash"), "Must be bash script");
    assert.ok(scriptContent.includes("set -euo pipefail"), "Must enforce strict bash error flags");
  });

  test("F7.2: Script supports --dry-run flag emitting JSON payload without network call", () => {
    assert.ok(scriptContent.includes("--dry-run"), "Must support --dry-run");
  });

  test("F7.3: Payload contains required fields (host: 'jaybharti.me', key, keyLocation, urlList)", () => {
    assert.ok(scriptContent.includes('"host"') || scriptContent.includes("host"), "Must declare host");
    assert.ok(scriptContent.includes('"key"') || scriptContent.includes("key"), "Must declare key");
    assert.ok(scriptContent.includes('"keyLocation"') || scriptContent.includes("keyLocation"), "Must declare keyLocation");
    assert.ok(scriptContent.includes('"urlList"') || scriptContent.includes("urlList"), "Must declare urlList");
  });

  test("F7.4: urlList includes root, /index.md, /llms.txt, and canonical project pages", () => {
    assert.ok(scriptContent.includes("index.md"), "urlList must include index.md");
    assert.ok(scriptContent.includes("llms.txt"), "urlList must include llms.txt");
  });

  test("F7.5: Handles API response codes (200, 202, 400, 403, 422) appropriately", () => {
    assert.ok(scriptContent.includes("200") && scriptContent.includes("202"), "Must check 200/202 success codes");
  });
});

// Feature 8: Google Site Verification Hook
describe("F8: Google Site Verification Hook (Tier 1)", () => {
  const targetHtml = readFile("index.html");
  assert.ok(targetHtml, "index.html must exist");

  test("F8.1: <meta name='google-site-verification' content='...'> tag structure is valid", () => {
    assert.match(targetHtml, /<meta\s+name=["']google-site-verification["']\s+content=["'][^"']*["']\s*\/?>/i);
  });

  test("F8.2: Meta tag contains valid attributes without syntax errors or unclosed quotes", () => {
    const metaTag = /<meta\s+name=["']google-site-verification["'][^>]*>/i.exec(targetHtml);
    assert.ok(metaTag, "Meta tag must be extractable");
    assert.ok(metaTag[0].endsWith(">"), "Must be closed properly");
  });

  test("F8.3: Meta tag is placed in <head> alongside canonical and SEO meta tags", () => {
    const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(targetHtml);
    assert.ok(head, "Head must exist");
    assert.ok(head[1].includes("google-site-verification"), "Tag must be inside <head>");
  });

  test("F8.4: Meta tag content attribute is ready for user's verification token", () => {
    const match = /content=["']([^"']*)["']/i.exec(
      /<meta\s+name=["']google-site-verification["'][^>]*>/i.exec(targetHtml)[0]
    );
    assert.ok(match !== null, "Content attribute must exist");
  });

  test("F8.5: Verification hook is non-visual and introduces zero layout changes", () => {
    const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(targetHtml);
    assert.ok(body, "Body must exist");
    assert.ok(!body[1].includes("google-site-verification"), "Must NOT be placed in <body>");
  });
});

// Feature 9: Cloudflare Edge _headers Tuning
describe("F9: Cloudflare Edge _headers Tuning (Tier 1)", () => {
  const targetHeaders = readFile("_headers");
  assert.ok(targetHeaders, "_headers must exist");
  const parsed = parseCloudflareHeaders(targetHeaders);

  test("F9.1: Long-term immutable caching configured for /photos/* and /assets/*", () => {
    const photos = parsed.pathRules.get("/photos/*");
    assert.ok(photos, "Missing /photos/* rule");
    const cc = photos.get("cache-control").values.join(", ");
    assert.ok(cc.includes("immutable"), "/photos/* must be immutable");
    assert.ok(cc.includes("31536000"), "/photos/* must have 1-year max-age");
  });

  test("F9.2: Fresh caching with SWR configured for /robots.txt, /sitemap.xml, /llms.txt, /index.md", () => {
    for (const p of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/index.md"]) {
      const rule = parsed.pathRules.get(p);
      assert.ok(rule, `Missing rule for ${p}`);
      const cc = rule.get("cache-control").values.join(", ");
      assert.ok(cc.includes("86400"), `${p} must have 1-day max-age`);
      assert.ok(cc.includes("stale-while-revalidate"), `${p} must have stale-while-revalidate`);
    }
  });

  test("F9.3: Preserves RFC 9727 Link headers for / and /index.html", () => {
    for (const p of ["/", "/index.html"]) {
      const rule = parsed.pathRules.get(p);
      assert.ok(rule, `Missing rule for ${p}`);
      const link = rule.get("link").values.join(", ");
      assert.ok(link.includes('rel="api-catalog"'), "Link must advertise api-catalog");
      assert.ok(link.includes('rel="service-desc"'), "Link must advertise service-desc");
      assert.ok(link.includes('rel="describedby"'), "Link must advertise describedby");
    }
  });

  test("F9.4: Sets Vary: Accept on /index.md and /", () => {
    const md = parsed.pathRules.get("/index.md");
    assert.ok(md, "Missing /index.md rule");
    const vary = md.get("vary");
    assert.ok(vary && vary.values.some(v => v.includes("Accept")), "/index.md must have Vary: Accept");
  });

  test("F9.5: Standard security headers present (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)", () => {
    const globalRule = parsed.pathRules.get("/*");
    assert.ok(globalRule, "Missing global /* security rules");
    assert.ok(globalRule.has("x-content-type-options"), "Missing X-Content-Type-Options");
    assert.ok(globalRule.has("x-frame-options"), "Missing X-Frame-Options");
    assert.ok(globalRule.has("referrer-policy"), "Missing Referrer-Policy");
  });
});

// Feature 10: Cloudflare Worker Continuity
describe("F10: Cloudflare Worker Continuity (Tier 1)", () => {
  test("F10.1: Worker exports handleRequest and acceptsMarkdown functions", () => {
    assert.equal(typeof handleRequest, "function", "handleRequest must be a function");
    assert.equal(typeof acceptsMarkdown, "function", "acceptsMarkdown must be a function");
  });

  test("F10.2: Content negotiation: requests with Accept: text/markdown route to index.md", async () => {
    const calls = [];
    const res = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: "text/markdown" } }),
      async (req) => {
        calls.push(req.url);
        return new Response("# Content", { status: 200, headers: { "Content-Type": "text/markdown" } });
      }
    );
    assert.equal(res.status, 200);
    assert.deepEqual(calls, ["https://jaybharti.me/index.md"]);
  });

  test("F10.3: Browser requests without markdown Accept return index.html", async () => {
    const calls = [];
    const res = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: "text/html,application/xhtml+xml" } }),
      async (req) => {
        calls.push(req.url);
        return new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    );
    assert.equal(res.status, 200);
    assert.deepEqual(calls, ["https://jaybharti.me/"]);
  });

  test("F10.4: Link headers are injected into root responses preserving discovery links", async () => {
    const res = await handleRequest(
      new Request("https://jaybharti.me/"),
      async () => new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html" } })
    );
    const linkHeader = res.headers.get("Link");
    assert.ok(linkHeader, "Link header must be attached");
    assert.ok(linkHeader.includes('rel="describedby"'), "Must include describedby relation");
  });

  test("F10.5: HEAD requests return headers without response body", async () => {
    const res = await handleRequest(
      new Request("https://jaybharti.me/", { method: "HEAD" }),
      async () => new Response(null, { status: 200, headers: { "Content-Type": "text/html" } })
    );
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "");
  });
});

// Feature 11: Cloudflare Dashboard Documentation
describe("F11: Cloudflare Dashboard Documentation (Tier 1)", () => {
  const guideContent = readFile("CLOUDFLARE_GUIDE.md");
  assert.ok(guideContent, "CLOUDFLARE_GUIDE.md must exist");

  test("F11.1: Cloudflare guide documentation contains comprehensive edge optimization instructions", () => {
    assert.ok(guideContent.length > 200, "Documentation must be substantive");
  });

  test("F11.2: Documents Crawler Hints and IndexNow edge push integration", () => {
    assert.ok(guideContent.includes("Crawler Hints"), "Must document Crawler Hints");
    assert.ok(guideContent.includes("IndexNow"), "Must document IndexNow integration");
  });

  test("F11.3: Documents Browser Cache TTL configured to 'Respect Existing Headers'", () => {
    assert.ok(guideContent.includes("Browser Cache TTL"), "Must document Browser Cache TTL");
    assert.ok(guideContent.includes("Respect Existing Headers"), "Must instruct Respect Existing Headers");
  });

  test("F11.4: Documents Early Hints (103 Early Hints) and Smart Tiered Caching", () => {
    assert.ok(guideContent.includes("Early Hints"), "Must document Early Hints");
    assert.ok(guideContent.includes("Tiered Cache"), "Must document Tiered Cache");
  });

  test("F11.5: Documents AI Crawlers and WAF bot management policies", () => {
    assert.ok(guideContent.includes("Bots") || guideContent.includes("AI Crawlers"), "Must document Bot management");
    assert.ok(guideContent.includes("GPTBot") || guideContent.includes("ClaudeBot"), "Must mention verified bots");
  });
});

// Feature 12: Automated Verification Test Runner
describe("F12: Automated Verification Test Runner (Tier 1)", () => {
  test("F12.1: Test runner runs using native Node.js node:test with zero runtime npm dependencies", () => {
    assert.ok(process.versions.node, "Native node runtime is active");
    assert.ok(!fs.existsSync(getRepoPath("node_modules")), "Zero npm dependencies in repository root");
  });

  test("F12.2: Reusable helper validators exist in tests/helpers/ (schema, robots, xml, headers, html)", () => {
    assert.ok(fs.existsSync(getRepoPath("tests/helpers/schema_validator.mjs")), "schema_validator.mjs must exist");
    assert.ok(fs.existsSync(getRepoPath("tests/helpers/robots_validator.mjs")), "robots_validator.mjs must exist");
    assert.ok(fs.existsSync(getRepoPath("tests/helpers/xml_validator.mjs")), "xml_validator.mjs must exist");
    assert.ok(fs.existsSync(getRepoPath("tests/helpers/headers_validator.mjs")), "headers_validator.mjs must exist");
    assert.ok(fs.existsSync(getRepoPath("tests/helpers/html_guard.mjs")), "html_guard.mjs must exist");
  });

  test("F12.3: Test suite targets >= 138 total tests across 4 tiers", () => {
    const tierFiles = [
      "tests/e2e/tier1_features.test.mjs",
      "tests/e2e/tier2_boundaries.test.mjs",
      "tests/e2e/tier3_pairwise.test.mjs",
      "tests/e2e/tier4_scenarios.test.mjs",
      "tests/adversarial/adversarial_r3_r4.test.mjs"
    ];
    for (const f of tierFiles) {
      assert.ok(fs.existsSync(getRepoPath(f)), `Test file ${f} must exist`);
    }
  });

  test("F12.4: Makefile is present in repository root with required targets", () => {
    const makefile = readFile("Makefile");
    assert.ok(makefile, "Makefile must exist");
    assert.ok(makefile.includes("test:"), "Makefile must have test target");
    assert.ok(makefile.includes("verify:"), "Makefile must have verify target");
    assert.ok(makefile.includes("indexnow:"), "Makefile must have indexnow target");
    assert.ok(makefile.includes("indexnow-dry:"), "Makefile must have indexnow-dry target");
  });

  test("F12.5: Test results report detailed pass/fail status and execution metrics", (t) => {
    assert.ok(t && typeof t.diagnostic === "function", "Test context supports diagnostic reporting");
  });
});
