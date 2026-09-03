import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { handleRequest, acceptsMarkdown } from "../../cloudflare/markdown-negotiation-worker/src/index.js";
import { parseCloudflareHeaders } from "../helpers/headers_validator.mjs";
import { validateHtmlIntegrity } from "../helpers/html_guard.mjs";

describe("Adversarial R3: Cloudflare Worker Content Negotiation Stress Tests", () => {
  // Mock origin response generator
  function mockOrigin(body = "<html>site</html>", headers = {}, status = 200) {
    return async (req) => {
      const url = new URL(req.url);
      if (url.pathname === "/index.md") {
        return new Response("# Jay Bharti Profile\n", {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept-Encoding",
            ...headers
          }
        });
      }
      return new Response(body, {
        status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...headers
        }
      });
    };
  }

  test("ADV-R3.1: Complex Accept Header with HTML preferred over Markdown (q=0.9)", async () => {
    // Client prefers text/html (q=1.0) over text/markdown (q=0.9)
    const header = "text/html,application/xhtml+xml,text/markdown;q=0.9,*/*;q=0.8";
    const accepts = acceptsMarkdown(header);

    const res = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: header } }),
      mockOrigin()
    );

    const contentType = res.headers.get("Content-Type");
    console.log(`[ADV-R3.1] acceptsMarkdown: ${accepts}, served Content-Type: ${contentType}`);

    assert.equal(accepts, false, "When HTML is preferred over markdown (q=1.0 vs 0.9), acceptsMarkdown must return false");
    assert.ok(contentType.includes("text/html"), "Worker must serve HTML when HTML has higher quality weight");
  });

  test("ADV-R3.2: Conflicting Accept Header with HTML explicitly higher q (q=0.8) than Markdown (q=0.5)", async () => {
    // Client specifies text/markdown;q=0.5, text/html;q=0.8
    const header = "text/markdown;q=0.5, text/html;q=0.8";
    const accepts = acceptsMarkdown(header);

    const res = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: header } }),
      mockOrigin()
    );

    const contentType = res.headers.get("Content-Type");
    console.log(`[ADV-R3.2] acceptsMarkdown: ${accepts}, served Content-Type: ${contentType}`);

    assert.equal(accepts, false, "When HTML q=0.8 exceeds markdown q=0.5, acceptsMarkdown must return false");
    assert.ok(contentType.includes("text/html"), "Worker must serve HTML");
  });

  test("ADV-R3.3: Wildcard Accept Header */* must NEVER trigger markdown negotiation", async () => {
    const header = "*/*";
    assert.equal(acceptsMarkdown(header), false, "*/* must return false");

    const res = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: header } }),
      mockOrigin()
    );
    assert.ok(res.headers.get("Content-Type").includes("text/html"), "*/* must receive HTML");
  });

  test("ADV-R3.4: Plain text Accept header must NEVER trigger markdown negotiation", async () => {
    const header = "text/plain";
    assert.equal(acceptsMarkdown(header), false, "text/plain must return false");

    const res = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: header } }),
      mockOrigin()
    );
    assert.ok(res.headers.get("Content-Type").includes("text/html"), "text/plain must receive HTML");
  });

  test("ADV-R3.5: Whitespace in quality parameter (q = 0) causes improper acceptance", () => {
    // RFC 9110 allows optional whitespace (OWS) around = in parameters
    const header = "text/markdown; q = 0";
    const accepts = acceptsMarkdown(header);
    console.log(`[ADV-R3.5] acceptsMarkdown('text/markdown; q = 0'): ${accepts}`);

    assert.equal(accepts, false, "acceptsMarkdown must return false when q=0 even with whitespace around '='");
  });

  test("ADV-R3.6a: acceptsMarkdown(null) returns false without throwing", () => {
    assert.doesNotThrow(() => {
      const res = acceptsMarkdown(null);
      assert.equal(res, false, "acceptsMarkdown(null) must return false");
    }, "acceptsMarkdown(null) must return false safely without throwing TypeError");
  });

  test("ADV-R3.6b: Malformed Accept strings do not throw unhandled exceptions", async () => {
    const malformedHeaders = [
      "",
      "   ",
      undefined,
      ";;;;;",
      ",,,,",
      "text/markdown;;;;",
      "text/markdown;q=",
      "text/markdown;q=NaN",
      "text/markdown;q=-1",
      "text/markdown;q=0.000",
      "text/markdown;q=invalid",
      "text/markdown;level=1;q=0",
      "text/markdown;q=0;level=1",
      "invalid-media-type",
      "text/markdown;foo=bar;baz=qux",
      "text/*",
      "*/*;q=0.8"
    ];

    for (const h of malformedHeaders) {
      assert.doesNotThrow(() => {
        const result = acceptsMarkdown(h);
        assert.equal(typeof result, "boolean");
      }, `Failed on header: ${h}`);

      const res = await handleRequest(
        new Request("https://jaybharti.me/", { headers: h ? { Accept: h } : {} }),
        mockOrigin()
      );
      assert.ok(res.status === 200);
    }
  });

  test("ADV-R3.7: Origin fallback behavior under origin failure modes", async () => {
    // Scenario 1: /index.md returns 404
    const res404 = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: "text/markdown" } }),
      async (req) => {
        if (req.url.includes("index.md")) return new Response("Not Found", { status: 404 });
        return new Response("<html>homepage</html>", { status: 200, headers: { "Content-Type": "text/html" } });
      }
    );
    assert.equal(res404.status, 200);
    assert.equal(await res404.text(), "<html>homepage</html>");

    // Scenario 2: /index.md origin throws network exception
    const resThrow = await handleRequest(
      new Request("https://jaybharti.me/", { headers: { Accept: "text/markdown" } }),
      async (req) => {
        if (req.url.includes("index.md")) throw new Error("Cloudflare origin unreachable");
        return new Response("<html>homepage</html>", { status: 200, headers: { "Content-Type": "text/html" } });
      }
    );
    assert.equal(resThrow.status, 200);
    assert.equal(await resThrow.text(), "<html>homepage</html>");
  });

  test("ADV-R3.8: HEAD request preserves headers but sends empty body for markdown", async () => {
    const res = await handleRequest(
      new Request("https://jaybharti.me/", { method: "HEAD", headers: { Accept: "text/markdown" } }),
      mockOrigin()
    );
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "");
    assert.equal(res.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  });
});

describe("Adversarial R3: Cloudflare _headers & Link Header Duplication Analysis", () => {
  const headersContent = readFileSync("_headers", "utf8");
  const parsed = parseCloudflareHeaders(headersContent);

  test("ADV-R3.9: CRLF Injection and Control Character Scan", () => {
    const rawBuf = readFileSync("_headers");
    assert.equal(rawBuf.includes(0x0d), false, "No Carriage Return (CRLF) injection");
    for (let i = 0; i < rawBuf.length; i++) {
      const b = rawBuf[i];
      // Allowed: tab (9), newline (10), printable ASCII (32-126)
      assert.ok(b === 9 || b === 10 || (b >= 32 && b <= 126), `Unexpected control character byte 0x${b.toString(16)} at offset ${i}`);
    }
  });

  test("ADV-R3.10: Path Precedence and Duplicate Overwrites", () => {
    const pathKeys = Array.from(parsed.pathRules.keys());
    const uniquePathKeys = new Set(pathKeys);
    assert.equal(pathKeys.length, uniquePathKeys.size, "No duplicate path blocks in _headers");

    // Check that /* only defines security headers and does not overwrite Cache-Control
    const globalRule = parsed.pathRules.get("/*");
    assert.ok(globalRule.has("x-content-type-options"));
    assert.ok(globalRule.has("x-frame-options"));
    assert.ok(globalRule.has("referrer-policy"));
    assert.equal(globalRule.has("cache-control"), false, "Global rule must not set Cache-Control to avoid overwriting specific assets");
  });

  test("ADV-R3.11: Worker-Origin Link Header Duplication when origin has _headers", async () => {
    // In Cloudflare Pages, the origin serves _headers:
    const originLinkHeader = parsed.pathRules.get("/").get("link").values.join(", ");
    
    // Worker receives origin response with existing Link header:
    const res = await handleRequest(
      new Request("https://jaybharti.me/"),
      async () => new Response("<html></html>", {
        headers: {
          "Content-Type": "text/html",
          "Link": originLinkHeader
        }
      })
    );

    const workerLink = res.headers.get("Link");
    console.log(`[ADV-R3.11] Worker final Link header:\n${workerLink}`);

    // Count occurrences of rel="api-catalog"
    const apiCatalogMatches = (workerLink.match(/rel="api-catalog"/g) || []).length;
    console.log(`[ADV-R3.11] 'rel="api-catalog"' occurrences: ${apiCatalogMatches}`);

    assert.equal(apiCatalogMatches, 1, "Worker must deduplicate Link header entries so rel='api-catalog' appears exactly once");
  });

  test("ADV-R3.12: RFC 9727 and IANA Link Relations Conformance", () => {
    const rootRule = parsed.pathRules.get("/");
    const linkVal = rootRule.get("link").values.join(", ");

    // Verify each link entry
    const entries = linkVal.split(/,\s*(?=<)/);
    for (const entry of entries) {
      const match = entry.match(/^<([^>]+)>;\s*rel="([^"]+)"(?:;\s*type="([^"]+)")?$/);
      assert.ok(match, `Invalid Link header entry syntax: ${entry}`);
      const [, uri, rel, type] = match;
      assert.ok(uri.startsWith("https://jaybharti.me"), `Link URI must be absolute https: ${uri}`);
      assert.ok(["api-catalog", "service-desc", "service-doc", "describedby", "alternate"].includes(rel), `Unrecognized relation: ${rel}`);
      if (rel === "api-catalog") assert.equal(type, "application/linkset+json");
      if (rel === "service-desc") assert.equal(type, "application/vnd.oai.openapi+json");
      if (rel === "service-doc") assert.equal(type, "text/html");
      if (rel === "describedby") assert.equal(type, "text/markdown");
      if (rel === "alternate") assert.equal(type, "text/markdown");
    }
  });
});

describe("Adversarial R4: Visual Regression & Layout Non-Destructive Guarantee", () => {
  const currentHtml = readFileSync("index.html", "utf8");
  const gitMainHtml = execSync("git show origin/main:index.html", { encoding: "utf8" });

  test("ADV-R4.1: Body and Viewport DOM is 100% Byte-Identical to origin/main", () => {
    const getBody = (html) => /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)[1];
    const currentBody = getBody(currentHtml);
    const mainBody = getBody(gitMainHtml);

    assert.equal(currentBody, mainBody, "Body content must be 100% byte-for-byte identical to origin/main");
  });

  test("ADV-R4.2: Critical Inline CSS is 100% Byte-Identical to origin/main", () => {
    const getStyles = (html) => {
      const matches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
      return matches.join("\n");
    };
    const currentStyles = getStyles(currentHtml);
    const mainStyles = getStyles(gitMainHtml);

    assert.equal(currentStyles, mainStyles, "Inline critical CSS must be 100% byte-for-byte identical to origin/main");
  });

  test("ADV-R4.3: External Stylesheet index.css is Unmodified", () => {
    const diff = execSync("git diff index.css", { encoding: "utf8" });
    assert.equal(diff.trim(), "", "index.css must have zero diff");
  });

  test("ADV-R4.4: Added <head> elements have zero visual rendering footprint", () => {
    // Extract only added lines in index.html
    const diff = execSync("git diff -U0 origin/main index.html", { encoding: "utf8" });
    const addedLines = diff
      .split("\n")
      .filter(line => line.startsWith("+") && !line.startsWith("+++"))
      .map(line => line.slice(1).trim());

    for (const line of addedLines) {
      // Must only be meta, link, script, or JSON-LD content
      const isSafe =
        line.startsWith("<meta ") ||
        line.startsWith("<link ") ||
        line.startsWith("<script ") ||
        line.startsWith("</script>") ||
        line.startsWith("{") ||
        line.startsWith("}") ||
        line.startsWith("[") ||
        line.startsWith("]") ||
        line.startsWith('"') ||
        line.startsWith("@") ||
        line === "";

      assert.ok(isSafe, `Unexpected non-head added line in HTML: ${line}`);
    }
  });

  test("ADV-R4.5: Core Web Vitals HTML layout guard passes with all 8 sections intact", () => {
    const guard = validateHtmlIntegrity(currentHtml);
    assert.ok(guard.criticalCssFound, "Critical CSS intact");
    assert.equal(guard.sectionsFound.length, 8, "All 8 layout section IDs preserved");
  });
});
