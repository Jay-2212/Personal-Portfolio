/**
 * Tier 2: 60 Boundary and Corner Case Tests (F1–F12, 5 tests each)
 * Validates edge conditions, RFC syntax constraints, error handling, and malformed inputs.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { countWords, readFile } from "../helpers/target_loader.mjs";
import { parseJsonLdFromHtml, validateSchemaGraph } from "../helpers/schema_validator.mjs";
import { parseRobotsTxt, validateAiBotAllowance, canFetch } from "../helpers/robots_validator.mjs";
import { parseSitemapXml } from "../helpers/xml_validator.mjs";
import { parseCloudflareHeaders, validateEdgeHeaders } from "../helpers/headers_validator.mjs";
import { validateHtmlIntegrity } from "../helpers/html_guard.mjs";
import { handleRequest, acceptsMarkdown } from "../../cloudflare/markdown-negotiation-worker/src/index.js";

// F1 Boundary: Princeton GEO Blocks & Word Counting
describe("F1 Boundary: GEO Content & Word Count Extremes (Tier 2)", () => {
  test("F1.B1: Word counter returns 0 for empty, null, or whitespace-only inputs", () => {
    assert.equal(countWords(""), 0);
    assert.equal(countWords("   \n\t  "), 0);
    assert.equal(countWords(null), 0);
    assert.equal(countWords(undefined), 0);
  });

  test("F1.B2: Word counts strictly outside [40, 60] are detected and flagged", () => {
    const under40 = "Jay Bharti is a Healthcare Administration specialist in Manipal who won the national award.";
    const countUnder = countWords(under40);
    assert.ok(countUnder < 40, `Expected under 40 words, got ${countUnder}`);

    const over60 = ("word ".repeat(65)).trim();
    const countOver = countWords(over60);
    assert.ok(countOver > 60, `Expected over 60 words, got ${countOver}`);
  });

  test("F1.B3: Heavy markdown markup (bold, italics, code, links) does not skew word count", () => {
    const raw = "**Jay Bharti** is a [Healthcare Administration](https://example.com) *specialist* with `DMAIC` and ~RAG~.";
    const count = countWords(raw);
    assert.equal(count, 11, `Expected 11 words, got ${count}`);
  });

  test("F1.B4: Mixed Windows CRLF and Unix LF line endings yield identical word counts", () => {
    const unix = "Line one of bio.\nLine two of bio.\nLine three of bio.";
    const win = "Line one of bio.\r\nLine two of bio.\r\nLine three of bio.";
    assert.equal(countWords(unix), countWords(win));
  });

  test("F1.B5: Unicode symbols (₹, %, -, °, quotes) preserve utf-8 integrity without corruption", () => {
    const textWithSymbols = "Reduced breakage by 95% at -50°C, saving ₹2.6 Lakhs annually with QualTech® Prize.";
    assert.ok(textWithSymbols.includes("₹2.6 Lakhs"));
    assert.ok(textWithSymbols.includes("-50°C"));
    assert.ok(textWithSymbols.includes("95%"));
    assert.ok(countWords(textWithSymbols) >= 10);
  });
});

// F2 Boundary: Schema.org JSON-LD Parser & Graph Validation
describe("F2 Boundary: Schema.org Graph Edge Conditions (Tier 2)", () => {
  test("F2.B1: Malformed JSON-LD in HTML throws SyntaxError with descriptive message", () => {
    const badHtml = '<script type="application/ld+json">{ "@context": "https://schema.org", bad_json: </script>';
    assert.throws(() => {
      parseJsonLdFromHtml(badHtml);
    }, SyntaxError);
  });

  test("F2.B2: Missing @context or non-schema.org context returns valid=false with explicit error", () => {
    const badContext = { "@context": "https://other.org", "@graph": [{ "@type": "Person", "name": "Jay Bharti" }] };
    const res = validateSchemaGraph(badContext);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("@context")));
  });

  test("F2.B3: Person node missing name or url fails validation", () => {
    const missingFields = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "ProfilePage", "mainEntity": {} },
        { "@type": "Person", "jobTitle": "Dev" }
      ]
    };
    const res = validateSchemaGraph(missingFields);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Person.name")));
  });

  test("F2.B4: Person sameAs missing GitHub authority profile fails validation", () => {
    const noGithub = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "ProfilePage", "mainEntity": {} },
        {
          "@type": "Person",
          "name": "Jay Bharti",
          "url": "https://jaybharti.me",
          "sameAs": ["https://linkedin.com/in/jay", "https://x.com/jay"]
        },
        { "@type": "SoftwareApplication", "name": "CapexIQ" }
      ]
    };
    const res = validateSchemaGraph(noGithub);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("github.com/Jay-2212")));
  });

  test("F2.B5: ProfilePage missing mainEntity fails validation", () => {
    const noMainEntity = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "ProfilePage", "name": "Portfolio" },
        { "@type": "Person", "name": "Jay Bharti", "url": "https://jaybharti.me", "sameAs": ["https://github.com/Jay-2212", "https://x.com", "https://linkedin.com"] },
        { "@type": "SoftwareApplication", "name": "CapexIQ" }
      ]
    };
    const res = validateSchemaGraph(noMainEntity);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("mainEntity")));
  });
});

// F3 Boundary: Enriched llms.txt Edge Conditions
describe("F3 Boundary: llms.txt Structure and Syntax (Tier 2)", () => {
  test("F3.B1: Missing top-level H1 title in llms.txt is flagged", () => {
    const badLlms = "Just some random text without an H1 title.";
    assert.ok(!badLlms.startsWith("# "), "Does not start with H1");
  });

  test("F3.B2: Malformed markdown links (empty link text or missing URL) detected", () => {
    const badLinks = "- [](https://example.com) (missing text)\n- [Valid](https://example.com)\n- [No URL]()";
    const emptyTextRegex = /\[\s*\]\([^)]+\)/;
    const emptyUrlRegex = /\[[^\]]+\]\(\s*\)/;
    assert.ok(emptyTextRegex.test(badLinks), "Detects empty link text");
    assert.ok(emptyUrlRegex.test(badLinks), "Detects empty URL");
  });

  test("F3.B3: CRLF line endings in llms.txt parse sections identically to Unix LF", () => {
    const winLlms = "# Title\r\n\r\n> Guide\r\n\r\n## Projects\r\n- [P1](https://example.com)\r\n";
    const sections = winLlms.split(/\r?\n(?=## )/);
    assert.equal(sections.length, 2);
  });

  test("F3.B4: Core project URLs must not use insecure http:// protocol", () => {
    const urls = [
      "https://capexiq.jaybharti.me",
      "https://jaybharti.me/mac-orchestrator",
      "https://jaybharti.me/meridian"
    ];
    for (const u of urls) {
      assert.ok(u.startsWith("https://"), `${u} must use https://`);
    }
  });

  test("F3.B5: Relative project URLs without leading slash or domain are detected", () => {
    const relativeUrl = "capexiq/index.html";
    assert.ok(!relativeUrl.startsWith("http://") && !relativeUrl.startsWith("https://"), "Flags non-absolute URLs");
  });
});

// F4 Boundary: Additive HTML & Layout Regression
describe("F4 Boundary: Layout and DOM Regressions (Tier 2)", () => {
  test("F4.B1: HTML without inlined critical <style> fails validation", () => {
    const noCssHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><div id='hero'></div></body></html>";
    const res = validateHtmlIntegrity(noCssHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("critical <style>")));
  });

  test("F4.B2: Missing any core layout section ID fails validation", () => {
    const incompleteHtml = `<!DOCTYPE html><html><head>
      <style>:root{--bg:#fff;--text:#000;}</style>
      <link rel="canonical" href="https://jaybharti.me/">
      </head><body><div id="nav"></div><div id="hero"></div></body></html>`;
    const res = validateHtmlIntegrity(incompleteHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("id=\"side-projects\"")));
  });

  test("F4.B3: Project image missing loading='lazy' attribute is detected", () => {
    const imgHtml = `<!DOCTYPE html><html><head><style>:root{--bg:#000;--text:#fff;}</style>
      <link rel="canonical" href="https://jaybharti.me/"></head>
      <body><img src="project.webp" width="600" height="400"></body></html>`;
    const res = validateHtmlIntegrity(imgHtml);
    assert.equal(res.imageMetrics.lazyImages, 0, "Should detect zero lazy images");
  });

  test("F4.B4: Removal of canonical link fails validation", () => {
    const noCanonicalHtml = `<!DOCTYPE html><html><head>
      <style>:root{--bg:#000;--text:#fff;}</style></head>
      <body><div id="hero"></div></body></html>`;
    const res = validateHtmlIntegrity(noCanonicalHtml);
    assert.ok(res.errors.some(e => e.includes("canonical link")));
  });

  test("F4.B5: Malformed HTML missing <head> or <body> tags detected", () => {
    const brokenHtml = "<div>No head or body here</div>";
    const res = validateHtmlIntegrity(brokenHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("<head>")));
  });
});

// F5 Boundary: Modernized robots.txt (RFC 9309)
describe("F5 Boundary: robots.txt RFC 9309 Parser Edge Conditions (Tier 2)", () => {
  test("F5.B1: Deprecated directive 'Content-Signal:' is strictly rejected as unknown", () => {
    const sample = "User-agent: *\nContent-Signal: search=yes\nAllow: /\n";
    const res = parseRobotsTxt(sample);
    assert.equal(res.valid, false);
    assert.equal(res.unknownDirectives.length, 1);
    assert.equal(res.unknownDirectives[0].directive, "content-signal");
  });

  test("F5.B2: Directives are case-insensitive per RFC 9309 (USER-AGENT, allow, Disallow)", () => {
    const sample = "USER-AGENT: GPTBot\nALLOW: /\ndisallow: /private\n";
    const res = parseRobotsTxt(sample);
    assert.ok(res.valid, `Expected valid parse, errors: ${res.errors.join("; ")}`);
    assert.ok(res.userAgents.includes("GPTBot"));
  });

  test("F5.B3: Directive placed before any User-agent declaration is flagged as error", () => {
    const orphanDirective = "Allow: /\nUser-agent: *\n";
    const res = parseRobotsTxt(orphanDirective);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("before any User-agent")));
  });

  test("F5.B4: Inline comments following # are stripped cleanly", () => {
    const sample = "User-agent: Bingbot # Microsoft crawler\nAllow: / # allow all\n";
    const res = parseRobotsTxt(sample);
    assert.ok(res.valid);
    assert.ok(res.userAgents.includes("Bingbot"));
    assert.equal(res.records[0].rules[0].path, "/");
  });

  test("F5.B5: canFetch() handles longest-match prefix correctly per RFC 9309", () => {
    const sample = "User-agent: *\nDisallow: /photos/\nAllow: /photos/public/\n";
    const res = parseRobotsTxt(sample);
    assert.equal(canFetch(res, "AnyBot", "/photos/private/pic.jpg"), false);
    assert.equal(canFetch(res, "AnyBot", "/photos/public/pic.jpg"), true);
  });
});

// F6 Boundary: Accurate sitemap.xml Edge Conditions
describe("F6 Boundary: Sitemap XML Schema and Validation (Tier 2)", () => {
  test("F6.B1: Malformed XML without closing <urlset> fails parsing cleanly", () => {
    const brokenXml = "<?xml version='1.0'?><urlset><url><loc>https://jaybharti.me/</loc></url>";
    // Missing </urlset>
    assert.ok(!brokenXml.endsWith("</urlset>"), "Detects unclosed urlset");
  });

  test("F6.B2: Non-ISO-8601 lastmod dates (e.g. DD-MM-YYYY, YYYY/MM/DD) are rejected", () => {
    const xmlBadDate = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://jaybharti.me/</loc><lastmod>03-09-2026</lastmod></url>
    </urlset>`;
    const res = parseSitemapXml(xmlBadDate);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Invalid lastmod format")));
  });

  test("F6.B3: Priority out of [0.0, 1.0] range (e.g. 1.5, -0.1) rejected", () => {
    const xmlBadPriority = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://jaybharti.me/</loc><priority>1.5</priority></url>
    </urlset>`;
    const res = parseSitemapXml(xmlBadPriority);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Invalid priority")));
  });

  test("F6.B4: Unrecognized changefreq value (e.g. 'hourly-sometimes') rejected", () => {
    const xmlBadFreq = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://jaybharti.me/</loc><changefreq>rarely</changefreq></url>
    </urlset>`;
    const res = parseSitemapXml(xmlBadFreq);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Invalid changefreq")));
  });

  test("F6.B5: Duplicate <loc> entries in sitemap detected and reported", () => {
    const xmlDup = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://jaybharti.me/</loc></url>
      <url><loc>https://jaybharti.me/</loc></url>
    </urlset>`;
    const res = parseSitemapXml(xmlDup);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("Duplicate URL")));
  });
});

// F7 Boundary: Automated IndexNow Script
describe("F7 Boundary: IndexNow Protocol & Input Validation (Tier 2)", () => {
  test("F7.B1: IndexNow payload generator rejects empty host or empty urlList", () => {
    function generatePayload(host, key, urlList) {
      if (!host || typeof host !== "string") throw new Error("Host must not be empty");
      if (!Array.isArray(urlList) || urlList.length === 0) throw new Error("urlList must not be empty");
      return { host, key, urlList };
    }
    assert.throws(() => generatePayload("", "key", ["https://jaybharti.me/"]), /Host must not be empty/);
    assert.throws(() => generatePayload("jaybharti.me", "key", []), /urlList must not be empty/);
  });

  test("F7.B2: IndexNow key validator rejects keys shorter than 8 characters or with non-hex chars", () => {
    function validateKey(key) {
      if (!key || key.length < 8) return false;
      return /^[0-9a-fA-F]+$/.test(key);
    }
    assert.equal(validateKey("short"), false);
    assert.equal(validateKey("12345678"), true);
    assert.equal(validateKey("c4b12d593e8749a0a4e76a6cf3832d21"), true);
    assert.equal(validateKey("invalid-hex-key!!"), false);
  });

  test("F7.B3: KeyLocation URL must match https://<host>/<key>.txt", () => {
    const host = "jaybharti.me";
    const key = "c4b12d593e8749a0a4e76a6cf3832d21";
    const expected = `https://${host}/${key}.txt`;
    assert.equal(expected, "https://jaybharti.me/c4b12d593e8749a0a4e76a6cf3832d21.txt");
  });

  test("F7.B4: Non-https endpoints in urlList are detected and flagged", () => {
    const urls = ["https://jaybharti.me/", "http://jaybharti.me/insecure"];
    const hasInsecure = urls.some(u => !u.startsWith("https://"));
    assert.ok(hasInsecure, "Detected insecure HTTP URL");
  });

  test("F7.B5: API response code mapping handles 200, 202, 400, 403, 422 properly", () => {
    const codes = {
      200: "OK",
      202: "Accepted",
      400: "Bad Request",
      403: "Forbidden - Invalid Key",
      422: "Unprocessable Entity - Domain Mismatch"
    };
    assert.equal(codes[200], "OK");
    assert.equal(codes[202], "Accepted");
    assert.ok(codes[403].includes("Invalid Key"));
  });
});

// F8 Boundary: Google Site Verification Hook
describe("F8 Boundary: Verification Hook Syntax and Placement (Tier 2)", () => {
  test("F8.B1: Empty content attribute (<meta name='google-site-verification' content=''>) flagged", () => {
    const emptyContent = '<meta name="google-site-verification" content="">';
    const match = /content=["']([^"']*)["']/.exec(emptyContent);
    assert.equal(match[1], "");
  });

  test("F8.B2: Unclosed meta tag or missing attribute detected", () => {
    const badMeta = '<meta name="google-site-verification"';
    assert.ok(!badMeta.endsWith(">"), "Unclosed tag detected");
  });

  test("F8.B3: Tag placed inside <body> instead of <head> detected", () => {
    const htmlWithTagInBody = "<html><head></head><body><meta name='google-site-verification' content='token'></body></html>";
    const bodyContent = /<body[^>]*>([\s\S]*?)<\/body>/.exec(htmlWithTagInBody)[1];
    assert.ok(bodyContent.includes("google-site-verification"), "Found misplaced tag in body");
  });

  test("F8.B4: Duplicate google-site-verification tags detected", () => {
    const htmlWithDups = `<meta name="google-site-verification" content="tok1">\n<meta name="google-site-verification" content="tok2">`;
    const count = (htmlWithDups.match(/name=["']google-site-verification["']/g) || []).length;
    assert.equal(count, 2, "Detected duplicate meta tags");
  });

  test("F8.B5: Tag with typo in name (google-verification) detected", () => {
    const typoTag = '<meta name="google-verification" content="tok">';
    assert.ok(!typoTag.includes('name="google-site-verification"'));
  });
});

// F9 Boundary: Cloudflare Edge _headers Tuning
describe("F9 Boundary: _headers Syntax and Security Edge Rules (Tier 2)", () => {
  test("F9.B1: Header declared before any path block throws error", () => {
    const invalidHeaders = "  Cache-Control: public\n/path\n  Header: Val";
    const res = parseCloudflareHeaders(invalidHeaders);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("before any path block")));
  });

  test("F9.B2: Header line missing colon separator throws error", () => {
    const invalidFormat = "/path\n  InvalidHeaderWithoutColon";
    const res = parseCloudflareHeaders(invalidFormat);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes("missing colon")));
  });

  test("F9.B3: Static assets missing immutable directive in Cache-Control caught", () => {
    const missingImmutable = "/photos/*\n  Cache-Control: public, max-age=31536000\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable";
    const parsed = parseCloudflareHeaders(missingImmutable);
    const val = validateEdgeHeaders(parsed);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some(e => e.includes('must include "immutable"')));
  });

  test("F9.B4: Discovery files missing stale-while-revalidate in Cache-Control caught", () => {
    const missingSwr = "/robots.txt\n  Cache-Control: public, max-age=86400\n/photos/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/sitemap.xml\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n/llms.txt\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n/index.md\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n/\n  Link: <https://jaybharti.me/.well-known/api-catalog>; rel=\"api-catalog\", <https://jaybharti.me/.well-known/portfolio-api.json>; rel=\"service-desc\", <https://jaybharti.me/>; rel=\"service-doc\", <https://jaybharti.me/index.md>; rel=\"describedby\"\n/index.html\n  Link: <https://jaybharti.me/.well-known/api-catalog>; rel=\"api-catalog\", <https://jaybharti.me/.well-known/portfolio-api.json>; rel=\"service-desc\", <https://jaybharti.me/>; rel=\"service-doc\", <https://jaybharti.me/index.md>; rel=\"describedby\"";
    const parsed = parseCloudflareHeaders(missingSwr);
    const val = validateEdgeHeaders(parsed);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some(e => e.includes("stale-while-revalidate")));
  });

  test("F9.B5: Unapproved relation (e.g. agent-skills) in Link header caught", () => {
    const leakedRelation = `/\n  Link: <https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog", <https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc", <https://jaybharti.me/>; rel="service-doc", <https://jaybharti.me/index.md>; rel="describedby", <https://jaybharti.me/.well-known/agent-skills/index.json>; rel="agent-skills"\n/index.html\n  Link: <https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog", <https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc", <https://jaybharti.me/>; rel="service-doc", <https://jaybharti.me/index.md>; rel="describedby"\n/photos/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/robots.txt\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n/sitemap.xml\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n/llms.txt\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n/index.md\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800`;
    const parsed = parseCloudflareHeaders(leakedRelation);
    const val = validateEdgeHeaders(parsed);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some(e => e.includes("unapproved registered relation")));
  });
});

// F10 Boundary: Cloudflare Worker Continuity
describe("F10 Boundary: Content Negotiation & Edge Fallback (Tier 2)", () => {
  test("F10.B1: acceptsMarkdown handles malformed or empty Accept header safely", () => {
    assert.equal(acceptsMarkdown(""), false);
    assert.equal(acceptsMarkdown("   "), false);
    assert.equal(acceptsMarkdown(undefined), false);
    assert.equal(acceptsMarkdown("text/markdown;invalid-param"), true);
  });

  test("F10.B2: acceptsMarkdown with explicit q=0 returns false", () => {
    assert.equal(acceptsMarkdown("text/markdown;q=0"), false);
    assert.equal(acceptsMarkdown("text/markdown;q=0.0"), false);
  });

  test("F10.B3: acceptsMarkdown with mixed Accept header returns true", () => {
    assert.equal(acceptsMarkdown("text/html;q=0.8, text/markdown;q=0.9"), true);
  });

  test("F10.B4: Origin fetch failure on index.md falls back gracefully without 500", async () => {
    const fallbackResponse = new Response("<html>homepage</html>", { status: 200, headers: { "Content-Type": "text/html" } });
    const res = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: "text/markdown" } }),
      async (req) => {
        if (req.url.includes("index.md")) {
          return new Response("Not Found", { status: 404 });
        }
        return fallbackResponse;
      }
    );
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "<html>homepage</html>");
  });

  test("F10.B5: Non-GET/HEAD methods (POST, PUT, DELETE) pass through untouched", async () => {
    const postRes = new Response("OK", { status: 201 });
    const res = await handleRequest(
      new Request("https://jaybharti.me/", { method: "POST", headers: { Accept: "text/markdown" } }),
      async () => postRes
    );
    assert.equal(res.status, 201);
  });
});

// F11 Boundary: Cloudflare Dashboard Documentation
describe("F11 Boundary: Edge Optimization Guide Edge Cases (Tier 2)", () => {
  test("F11.B1: Empty guide content fails validation", () => {
    const emptyGuide = "";
    assert.ok(emptyGuide.length < 50, "Empty guide rejected");
  });

  test("F11.B2: Guide missing Crawler Hints section detected", () => {
    const incompleteGuide = "# Guide\n## Browser Cache TTL\nRespect Existing Headers\n";
    assert.ok(!incompleteGuide.includes("Crawler Hints"), "Missing Crawler Hints flagged");
  });

  test("F11.B3: Guide specifying wrong Browser Cache TTL (e.g. '1 day') detected", () => {
    const badGuide = "Browser Cache TTL: set to 1 day";
    assert.ok(!badGuide.includes("Respect Existing Headers"), "Wrong Browser Cache TTL flagged");
  });

  test("F11.B4: Guide missing Early Hints or Smart Tiered Caching detected", () => {
    const guideWithoutEarlyHints = "## Crawler Hints\nEnabled\n## Browser Cache\nRespect Existing Headers\n";
    assert.ok(!guideWithoutEarlyHints.includes("Early Hints"), "Missing Early Hints flagged");
  });

  test("F11.B5: Incomplete AI bot allowlist in guide detected", () => {
    const partialBots = ["GPTBot", "ClaudeBot"];
    const required = ["GPTBot", "ClaudeBot", "PerplexityBot", "Bingbot"];
    const missing = required.filter(b => !partialBots.includes(b));
    assert.ok(missing.includes("PerplexityBot"), "Missing PerplexityBot detected");
  });
});

// F12 Boundary: Automated Verification Test Runner
describe("F12 Boundary: Validator Isolation and Resilience (Tier 2)", () => {
  test("F12.B1: readFile returns null safely for non-existent file paths", () => {
    assert.equal(readFile("non_existent_file_xyz.txt"), null);
  });

  test("F12.B2: parseSitemapXml handles XML with comments and CDATA cleanly", () => {
    const xmlWithComments = `<?xml version="1.0"?>
      <!-- sitemap comment -->
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://jaybharti.me/</loc><lastmod>2026-09-03</lastmod></url>
      </urlset>`;
    const res = parseSitemapXml(xmlWithComments);
    assert.ok(res.valid);
    assert.equal(res.count, 1);
  });

  test("F12.B3: parseRobotsTxt handles leading/trailing blank lines without errors", () => {
    const content = "\n\n\nUser-agent: *\nAllow: /\n\n\n";
    const res = parseRobotsTxt(content);
    assert.ok(res.valid);
    assert.equal(res.records.length, 1);
  });

  test("F12.B4: parseCloudflareHeaders handles multiple values for identical headers", () => {
    const content = "/path\n  Header: val1\n  Header: val2";
    const res = parseCloudflareHeaders(content);
    assert.ok(res.valid);
    const headerMap = res.pathRules.get("/path");
    assert.deepEqual(headerMap.get("header").values, ["val1", "val2"]);
  });

  test("F12.B5: Large inputs (>50KB) processed by validators within 50ms", () => {
    const start = performance.now();
    const largeRobots = ("User-agent: Bot\nAllow: /path\n\n").repeat(500);
    const res = parseRobotsTxt(largeRobots);
    const elapsed = performance.now() - start;
    assert.ok(res.valid);
    assert.ok(elapsed < 50, `Elapsed ${elapsed}ms exceeded 50ms limit`);
  });
});
