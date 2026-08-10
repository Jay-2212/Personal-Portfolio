# Homepage Link Response Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add registered discovery `Link` response headers to the portfolio homepage without changing the normal HTML or Markdown response bodies.

**Architecture:** Extend the existing `jaybharti.me/*` Cloudflare Worker so it wraps only `GET`/`HEAD` responses for `/` and `/index.html`, preserving the origin response while appending the four approved discovery links. Align the repository `_headers` fallback with the same values, then deploy and verify the live site and agent-readiness scan.

**Tech Stack:** Cloudflare Workers ES modules, Fetch `Request`/`Response`/`Headers`, Node.js built-in test runner, static `_headers`, Wrangler, `curl`, and `jq`.

## Global Constraints

- The normal browser homepage response MUST remain the origin's HTML body and content type.
- `GET` and `HEAD` requests to `/` and `/index.html` MUST expose `api-catalog`, `service-desc`, `service-doc`, and `describedby` Link relations.
- The link targets MUST be `https://jaybharti.me/.well-known/api-catalog`, `https://jaybharti.me/.well-known/portfolio-api.json`, `https://jaybharti.me/`, and `https://jaybharti.me/index.md`, respectively.
- The Worker MUST preserve origin status, status text, body, content type, and unrelated response headers; only the `Link` header may be added or extended.
- Explicit `Accept: text/markdown` negotiation MUST continue to return `/index.md` as `text/markdown; charset=utf-8`.
- Non-homepage paths, non-GET/HEAD methods, the API catalog branch, and existing fallback behavior MUST remain unchanged.
- Do not add a database, secret, binding, mutable request state, public write operation, or HTML/CSS/JavaScript page change.
- Do not stage or modify the pre-existing untracked `.wrangler/` or `capexiq/` directories.
- Verify the live response after deployment; local tests and git state alone do not establish production behavior.

---

### Task 1: Establish the failing homepage Link contract

**Files:**
- Modify: `cloudflare/markdown-negotiation-worker/test/index.test.mjs`
- Create: `cloudflare/markdown-negotiation-worker/test/link-headers.test.mjs`

**Interfaces:**
- Consumes: the existing `handleRequest(request, fetchImpl)` test helper and the repository `_headers` fallback.
- Produces: failing tests that define the exact homepage header, preserved HTML/Markdown behavior, bodyless HEAD behavior, and static fallback relations.

- [ ] **Step 1: Add the exact discovery header assertion and normal HTML regression test**

Add this constant near the existing test helpers in `cloudflare/markdown-negotiation-worker/test/index.test.mjs`:

```js
const HOMEPAGE_LINKS = [
  '<https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '<https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '<https://jaybharti.me/>; rel="service-doc"; type="text/html"',
  '<https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown"'
].join(", ");
```

Replace the assertions in `passes normal browser requests through unchanged` with:

```js
  assert.notEqual(result, original);
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "<html>site</html>");
  assert.equal(result.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
  assert.deepEqual(calls, ["https://jaybharti.me/"]);
```

This proves the browser body and content type survive the response wrapper while the discovery header is added.

- [ ] **Step 2: Add homepage HEAD and Markdown discovery assertions**

Append these tests to `cloudflare/markdown-negotiation-worker/test/index.test.mjs`:

```js
test("adds the same discovery links to an HTML homepage HEAD response without a body", async () => {
  const result = await handleRequest(
    request("/", { method: "HEAD" }),
    async () => response("<html>site</html>", { "Content-Type": "text/html; charset=utf-8" })
  );

  assert.equal(result.status, 200);
  assert.equal(await result.text(), "");
  assert.equal(result.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
});
```

Add this assertion to `returns index.md for an explicit Markdown request` after the existing content-type assertion:

```js
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
```

Add this assertion to `accepts Markdown in a mixed Accept header and on index.html`:

```js
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
```

These tests require the discovery metadata to follow both normal HTML and the existing agent-facing Markdown representation.

Update `does not negotiate Markdown when its quality is zero` so the root HTML
fallback still receives the discovery metadata while its body remains unchanged:

```js
  assert.notEqual(result, original);
  assert.equal(await result.text(), "<html>site</html>");
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
  assert.deepEqual(calls, ["https://jaybharti.me/"]);
```

Update `falls back to the original request when index.md cannot be fetched` in
the same way:

```js
  assert.notEqual(result, original);
  assert.equal(await result.text(), "<html>fallback</html>");
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
  assert.deepEqual(calls, ["https://jaybharti.me/index.md", "https://jaybharti.me/"]);
```

These two cases ensure that adding metadata does not accidentally bypass the
existing quality-zero or origin-fallback behavior.

- [ ] **Step 3: Add the static fallback contract before changing `_headers`**

Create `cloudflare/markdown-negotiation-worker/test/link-headers.test.mjs`:

```js
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
```

- [ ] **Step 4: Run the new tests and verify they fail for the missing homepage behavior**

Run from the repository root:

```bash
node --test cloudflare/markdown-negotiation-worker/test/index.test.mjs cloudflare/markdown-negotiation-worker/test/link-headers.test.mjs
```

Expected: the HTML homepage test fails because the current Worker returns the original response without a `Link` header, the Markdown assertions fail for the same reason, and the static fallback test fails because `_headers` still contains the old unregistered token relations.

- [ ] **Step 5: Commit the red tests**

```bash
git add cloudflare/markdown-negotiation-worker/test/index.test.mjs cloudflare/markdown-negotiation-worker/test/link-headers.test.mjs
git commit -m "test: define homepage Link header contract"
```

### Task 2: Add the minimal Worker response wrapper

**Files:**
- Modify: `cloudflare/markdown-negotiation-worker/src/index.js`

**Interfaces:**
- Consumes: the existing origin `Response` returned by `fetchImpl` and the existing Markdown/API catalog branches.
- Produces: `handleRequest(request, fetchImpl)` responses with the approved `Link` header only for readable homepage paths.

- [ ] **Step 1: Add the homepage Link constant and response helper**

Add this constant after `API_CATALOG_LINK`:

```js
const HOMEPAGE_LINKS = [
  '<https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '<https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '<https://jaybharti.me/>; rel="service-doc"; type="text/html"',
  '<https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown"'
].join(", ");
```

Add this helper after `withAcceptInVary`:

```js
function withHomepageLinks(request, response) {
  const url = new URL(request.url);
  const methodCanRead = request.method === "GET" || request.method === "HEAD";

  if (!methodCanRead || !MARKDOWN_PATHS.has(url.pathname)) return response;

  const headers = new Headers(response.headers);
  const existingLink = headers.get("Link");
  headers.set("Link", existingLink ? `${existingLink}, ${HOMEPAGE_LINKS}` : HOMEPAGE_LINKS);

  const body = request.method === "HEAD" || [204, 205, 304].includes(response.status)
    ? null
    : response.body;

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

The helper reuses `MARKDOWN_PATHS` because the existing set already identifies `/` and `/index.html` as homepage representations. It preserves unrelated `Link` values instead of overwriting them and avoids attaching a body to HEAD/no-content responses.

- [ ] **Step 2: Wrap ordinary homepage pass-through responses**

Replace:

```js
  if (!shouldNegotiate) return fetchImpl(request);
```

with:

```js
  if (!shouldNegotiate) return withHomepageLinks(request, await fetchImpl(request));
```

- [ ] **Step 3: Wrap Markdown success and fallback responses without changing negotiation**

Replace the non-OK and successful Markdown returns with:

```js
    if (!markdownResponse.ok) return withHomepageLinks(request, await fetchImpl(request));

    const headers = new Headers(markdownResponse.headers);
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.set("Vary", withAcceptInVary(headers.get("Vary")));

    return withHomepageLinks(request, new Response(request.method === "HEAD" ? null : markdownResponse.body, {
      status: markdownResponse.status,
      statusText: markdownResponse.statusText,
      headers
    }));
```

Replace the Markdown catch return with:

```js
  } catch {
    return withHomepageLinks(request, await fetchImpl(request));
  }
```

The API catalog branch remains before this logic and continues to set its own RFC 9727 `Content-Type` and `Link` header.

- [ ] **Step 4: Run the focused Worker tests and verify they pass**

Run:

```bash
node --test cloudflare/markdown-negotiation-worker/test/index.test.mjs
```

Expected: all existing Markdown/API catalog tests and the new homepage HTML, HEAD, and Markdown Link assertions pass with zero failures.

- [ ] **Step 5: Commit the Worker implementation**

```bash
git add cloudflare/markdown-negotiation-worker/src/index.js cloudflare/markdown-negotiation-worker/test/index.test.mjs
git commit -m "feat: add homepage Link response headers"
```

### Task 3: Align the static `_headers` fallback

**Files:**
- Modify: `_headers:1-14`

**Interfaces:**
- Consumes: the existing static homepage and `/index.html` header rules.
- Produces: a host-compatible fallback using the same four registered relation types as the Worker.

- [ ] **Step 1: Replace the root Link value**

Change the `Link` line under `/` to exactly:

```text
  Link: <https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", <https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", <https://jaybharti.me/>; rel="service-doc"; type="text/html", <https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown"
```

- [ ] **Step 2: Replace the `/index.html` Link values**

Change the existing discovery `Link` line under `/index.html` to the same exact line, and remove the separate `rel="canonical"` fallback line so both homepage rules expose the same approved discovery contract.

- [ ] **Step 3: Run the static fallback contract test**

Run:

```bash
node --test cloudflare/markdown-negotiation-worker/test/link-headers.test.mjs
```

Expected: the static fallback test passes with all four registered relations present and the old unregistered token relations absent.

- [ ] **Step 4: Commit the fallback alignment**

```bash
git add _headers
git commit -m "chore: align static homepage Link fallback"
```

### Task 4: Dry-run, deploy, and verify the real site

**Files:**
- No additional source files.

**Interfaces:**
- Consumes: the tested Worker bundle and the existing `jaybharti.me/*` route.
- Produces: live homepage responses with the four discovery relations and a passing `isitagentready.com` discoverability check.

- [ ] **Step 1: Run the complete local Worker test suite**

Run:

```bash
node --test cloudflare/markdown-negotiation-worker/test/index.test.mjs cloudflare/markdown-negotiation-worker/test/api-catalog.test.mjs cloudflare/markdown-negotiation-worker/test/link-headers.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Validate the Worker bundle without deployment**

Run from `cloudflare/markdown-negotiation-worker`:

```bash
../../capexiq/node_modules/.bin/wrangler deploy --dry-run --strict
```

Expected: Wrangler bundles `jaybharti-markdown-negotiation` successfully without uploading a new version.

- [ ] **Step 3: Deploy the existing Worker route**

Run from `cloudflare/markdown-negotiation-worker`:

```bash
../../capexiq/node_modules/.bin/wrangler deploy --strict
```

Expected: Cloudflare reports a successful deployment for the configured `jaybharti.me/*` route.

- [ ] **Step 4: Verify the normal live HTML response and discovery relations**

Run from the repository root:

```bash
curl -fsSL --max-time 30 -D /tmp/jaybharti-home.headers -o /tmp/jaybharti-home.html https://jaybharti.me/
```

Verify that `/tmp/jaybharti-home.headers` contains `content-type: text/html`, contains all four `rel` values, and `/tmp/jaybharti-home.html` contains `<html`.

- [ ] **Step 5: Verify live Markdown negotiation remains intact**

Run:

```bash
curl -fsSL --max-time 30 -H 'Accept: text/markdown' -D /tmp/jaybharti-markdown.headers -o /tmp/jaybharti-markdown.body https://jaybharti.me/
```

Verify that the response is `text/markdown; charset=utf-8`, contains all four `rel` values, begins with `# Jay Bharti`, and does not contain `<html`.

- [ ] **Step 6: Verify live HEAD behavior and the requested scanner result**

Run:

```bash
curl -fsSI --max-time 30 https://jaybharti.me/
```

Verify that the HEAD response includes all four `rel` values and no response body is required.

Run:

```bash
curl -fsS --max-time 60 -X POST https://isitagentready.com/api/scan -H 'Content-Type: application/json' --data '{"url":"https://jaybharti.me"}' -o /tmp/jaybharti-agent-scan.json
jq -e '.checks.discoverability.linkHeaders.status == "pass"' /tmp/jaybharti-agent-scan.json
```

Expected: `jq` exits zero and the scan reports `checks.discoverability.linkHeaders.status` as `pass`.

- [ ] **Step 7: Inspect the final diff and repository scope**

Run:

```bash
git diff --check HEAD~3..HEAD
git status --short --branch
```

Expected: only the approved spec, plan, Worker tests/source, and `_headers` commits are part of this task; the pre-existing untracked `.wrangler/` and `capexiq/` directories remain unstaged and unmodified.
