# API Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the portfolio's root profile endpoint through an RFC 9727 Linkset API catalog while preserving all normal browser behavior.

**Architecture:** Replace the existing non-RFC catalog body with a `linkset` document and add a small static OpenAPI 3.1 description at `/.well-known/portfolio-api.json`. Extend the already-deployed Cloudflare Worker only for `GET`/`HEAD /.well-known/api-catalog`, preserving the origin body/status while setting the RFC media type and self-describing `Link` header; all other requests remain pass-through or use the existing Markdown negotiation branch.

**Tech Stack:** Static JSON, Cloudflare Workers JavaScript ES modules, Node.js built-in test runner, Wrangler 4.x, `curl`, and `jq`.

## Global Constraints

- Serve `/.well-known/api-catalog` with HTTP 200 and `Content-Type: application/linkset+json` (with the RFC 9727 profile parameter).
- The catalog JSON MUST have a `linkset` array and one entry for the existing root profile endpoint.
- The entry MUST contain an absolute `anchor`, `service-desc` OpenAPI link, and `service-doc` documentation link; `status` remains omitted because no dedicated health endpoint exists.
- Normal HTML navigation to `https://jaybharti.me/` and existing explicit Markdown negotiation MUST remain unchanged.
- The Worker must not add a database, secret, binding, mutable request state, or public write operation.
- Do not stage or modify the pre-existing untracked `.wrangler/` directory.
- Publish the static files through the existing `main` branch/GitHub Pages path and deploy the existing Worker route only after tests and dry-run checks pass.

---

### Task 1: Establish failing catalog and Worker regression tests

**Files:**
- Create: `cloudflare/markdown-negotiation-worker/test/api-catalog.test.mjs`
- Modify: `cloudflare/markdown-negotiation-worker/test/index.test.mjs`

**Interfaces:**
- Consumes: the existing static catalog path and `handleRequest(request, fetchImpl)` exported by `cloudflare/markdown-negotiation-worker/src/index.js`.
- Produces: executable contract tests for the Linkset shape, OpenAPI description, catalog response headers, catalog HEAD behavior, and unchanged non-catalog behavior.

- [ ] **Step 1: Add the static catalog contract test before changing either JSON file**

Create `cloudflare/markdown-negotiation-worker/test/api-catalog.test.mjs` with this content:

```js
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
```

- [ ] **Step 2: Add Worker tests for the catalog GET and HEAD behavior**

Append these tests to `cloudflare/markdown-negotiation-worker/test/index.test.mjs`:

```js
test("sets the RFC 9727 media type and Link header for the API catalog", async () => {
  const catalog = response('{"linkset":[]}', { "Content-Type": "application/octet-stream" });
  const calls = [];
  const result = await handleRequest(
    request("/.well-known/api-catalog"),
    async (outgoing) => {
      calls.push(outgoing.url);
      return catalog;
    }
  );

  assert.equal(result.status, 200);
  assert.equal(
    result.headers.get("Content-Type"),
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'
  );
  assert.equal(
    result.headers.get("Link"),
    '<https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"'
  );
  assert.equal(await result.text(), '{"linkset":[]}');
  assert.deepEqual(calls, ["https://jaybharti.me/.well-known/api-catalog"]);
});

test("returns no body for an API catalog HEAD request while preserving status", async () => {
  const result = await handleRequest(
    request("/.well-known/api-catalog", { method: "HEAD" }),
    async () => response('{"linkset":[]}', { "Content-Type": "application/octet-stream" })
  );

  assert.equal(result.status, 200);
  assert.equal(await result.text(), "");
  assert.equal(result.headers.get("Content-Type"), 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"');
});
```

- [ ] **Step 3: Run the new tests and verify they fail for the missing Linkset/OpenAPI/Worker behavior**

Run:

```bash
node --test cloudflare/markdown-negotiation-worker/test/api-catalog.test.mjs cloudflare/markdown-negotiation-worker/test/index.test.mjs
```

Expected: the new catalog tests fail because the current document has `services` instead of `linkset`, the OpenAPI file does not exist, and the Worker leaves the catalog response as `application/octet-stream`; the existing Markdown tests continue to pass.

- [ ] **Step 4: Commit the red tests**

```bash
git add cloudflare/markdown-negotiation-worker/test/api-catalog.test.mjs cloudflare/markdown-negotiation-worker/test/index.test.mjs
git commit -m "test: define RFC 9727 API catalog contract"
```

### Task 2: Publish the static Linkset and OpenAPI description

**Files:**
- Modify: `.well-known/api-catalog`
- Create: `.well-known/portfolio-api.json`
- Modify: `_headers:25`

**Interfaces:**
- Consumes: the root profile endpoint and its existing HTML/Markdown representations.
- Produces: the static catalog body, the machine-readable OpenAPI description, and a host-compatible fallback header rule.

- [ ] **Step 1: Replace the legacy catalog body with the RFC 9727 Linkset**

Set `.well-known/api-catalog` to:

```json
{
  "linkset": [
    {
      "anchor": "https://jaybharti.me/",
      "service-desc": [
        {
          "href": "https://jaybharti.me/.well-known/portfolio-api.json",
          "type": "application/vnd.oai.openapi+json"
        }
      ],
      "service-doc": [
        {
          "href": "https://jaybharti.me/",
          "type": "text/html"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Add the OpenAPI 3.1 description**

Create `.well-known/portfolio-api.json` with a `GET /` operation that documents both `text/html` and `text/markdown` success representations:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Jay Bharti Portfolio Profile API",
    "description": "Public, read-only access to Jay Bharti's portfolio profile.",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "https://jaybharti.me" }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "getPortfolioProfile",
        "summary": "Read the portfolio profile",
        "description": "Returns the browser page by default or the same profile as Markdown when the client explicitly requests text/markdown.",
        "responses": {
          "200": {
            "description": "The portfolio profile.",
            "content": {
              "text/html": { "schema": { "type": "string" } },
              "text/markdown": { "schema": { "type": "string" } }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: Align the existing host header rule with the RFC profile**

Change only the catalog rule in `_headers` to:

```text
/.well-known/api-catalog
  Content-Type: application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"
```

- [ ] **Step 4: Run the static contract test and verify it passes**

Run:

```bash
node --test cloudflare/markdown-negotiation-worker/test/api-catalog.test.mjs
```

Expected: both catalog/OpenAPI tests pass.

### Task 3: Add the narrowly scoped Worker response handling

**Files:**
- Modify: `cloudflare/markdown-negotiation-worker/src/index.js`
- Test: `cloudflare/markdown-negotiation-worker/test/index.test.mjs`

**Interfaces:**
- Consumes: `handleRequest(request, fetchImpl)` and the origin response for `/.well-known/api-catalog`.
- Produces: the same origin body/status with `Content-Type: application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"` and a catalog `Link` header for `GET` and `HEAD` requests only.

- [ ] **Step 1: Add the catalog constants beside the existing Markdown path constant**

Add:

```js
const API_CATALOG_PATH = "/.well-known/api-catalog";
const API_CATALOG_CONTENT_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';
const API_CATALOG_LINK = '<https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"';
```

- [ ] **Step 2: Add the catalog branch before Markdown negotiation**

Inside `handleRequest`, after creating `url`, add this branch:

```js
  const methodCanRead = request.method === "GET" || request.method === "HEAD";

  if (methodCanRead && url.pathname === API_CATALOG_PATH) {
    try {
      const catalogResponse = await fetchImpl(request);
      if (!catalogResponse.ok) return catalogResponse;
      const headers = new Headers(catalogResponse.headers);
      headers.set("Content-Type", API_CATALOG_CONTENT_TYPE);
      headers.set("Link", API_CATALOG_LINK);

      return new Response(request.method === "HEAD" ? null : catalogResponse.body, {
        status: catalogResponse.status,
        statusText: catalogResponse.statusText,
        headers
      });
    } catch {
      return fetchImpl(request);
    }
  }
```

Keep the existing Markdown branch unchanged apart from reusing `methodCanRead` in place of its duplicate `GET`/`HEAD` check. Do not buffer the catalog body or introduce module-level request state.

- [ ] **Step 3: Run the complete Worker test suite and verify it passes**

Run:

```bash
node --test cloudflare/markdown-negotiation-worker/test/api-catalog.test.mjs cloudflare/markdown-negotiation-worker/test/index.test.mjs
```

Expected: all existing Markdown pass-through/negotiation tests and both new catalog response tests pass with zero failures.

- [ ] **Step 4: Validate the Worker bundle without deploying**

Run:

```bash
cd cloudflare/markdown-negotiation-worker
../../capexiq/node_modules/.bin/wrangler deploy --dry-run --strict
cd ../..
```

Expected: Wrangler bundles `jaybharti-markdown-negotiation` successfully without uploading a version or changing the route.

- [ ] **Step 5: Commit the implementation**

```bash
git add .well-known/api-catalog .well-known/portfolio-api.json _headers cloudflare/markdown-negotiation-worker/src/index.js
git commit -m "feat: publish RFC 9727 API catalog"
```

### Task 4: Publish and verify the real site contract

**Files:**
- No additional source files.

**Interfaces:**
- Consumes: the committed static files and Worker configuration.
- Produces: the live `jaybharti.me` catalog and a passing `isitagentready.com` discovery check without changing normal HTML behavior.

- [ ] **Step 1: Push the current approved `main` branch so GitHub Pages publishes the static files**

Run:

```bash
git push origin main
```

Expected: the current local `main` commits are accepted by the configured GitHub remote and GitHub Pages begins publishing the new `.well-known` files.

- [ ] **Step 2: Deploy the existing Worker route**

Run:

```bash
cd cloudflare/markdown-negotiation-worker
../../capexiq/node_modules/.bin/wrangler deploy --strict
cd ../..
```

Expected: Cloudflare reports a successful deployment for `jaybharti-markdown-negotiation` on the existing `jaybharti.me/*` route.

- [ ] **Step 3: Verify the live catalog status, media type, Linkset body, and OpenAPI link**

Run:

```bash
curl -fsSL --max-time 30 -D /tmp/jaybharti-api-catalog.headers -o /tmp/jaybharti-api-catalog.body https://jaybharti.me/.well-known/api-catalog
head -1 /tmp/jaybharti-api-catalog.headers | rg -q '^HTTP/[0-9.]+ 200'
rg -qi '^content-type: application/linkset\\+json(;|$)' /tmp/jaybharti-api-catalog.headers
jq -e '.linkset | length == 1 and .[0].anchor == "https://jaybharti.me/" and .[0]["service-desc"][0].href == "https://jaybharti.me/.well-known/portfolio-api.json" and .[0]["service-doc"][0].href == "https://jaybharti.me/"' /tmp/jaybharti-api-catalog.body
curl -fsSL --max-time 30 https://jaybharti.me/.well-known/portfolio-api.json | jq -e '.openapi == "3.1.0" and .paths["/"].get'
```

Expected: HTTP 200, an `application/linkset+json` content type, one correct Linkset entry, and a reachable OpenAPI 3.1 document.

- [ ] **Step 4: Verify normal browser behavior and existing Markdown behavior**

Run:

```bash
curl -fsSL --max-time 30 https://jaybharti.me/ | rg -q '<html'
curl -fsSL --max-time 30 -H 'Accept: text/markdown' https://jaybharti.me/ | rg -q '^# Jay Bharti'
curl -fsSL --max-time 30 -H 'Accept: text/markdown' https://jaybharti.me/meridian | rg -q '<html'
```

Expected: default navigation remains HTML, explicit root Markdown remains available, and non-root project navigation remains HTML.

- [ ] **Step 5: Run the requested agent-readiness scan**

Run:

```bash
curl -fsSL --max-time 60 -X POST https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://jaybharti.me"}' | tee /tmp/jaybharti-agent-readiness.json
jq -e '.checks.discovery.apiCatalog.status == "pass"' /tmp/jaybharti-agent-readiness.json
```

Expected: the API scan response contains `checks.discovery.apiCatalog.status` equal to `"pass"`.

- [ ] **Step 6: Inspect the final diff and remove only temporary verification files**

Run:

```bash
git diff --check HEAD^ HEAD
git status --short --branch
rm -f /tmp/jaybharti-api-catalog.headers /tmp/jaybharti-api-catalog.body /tmp/jaybharti-agent-readiness.json
```

Expected: the implementation commits contain only the intended catalog, OpenAPI, header, Worker, tests, and plan/spec files; the pre-existing `.wrangler/` directory remains untracked and untouched.
