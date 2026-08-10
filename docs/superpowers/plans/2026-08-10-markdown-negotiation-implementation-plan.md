# Markdown Content Negotiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a transparent Cloudflare Worker route that serves the portfolio's existing `index.md` only for explicit Markdown requests while preserving normal HTML browsing.

**Architecture:** A standalone JavaScript Worker named `jaybharti-markdown-negotiation` will run on `jaybharti.me/*`. Its handler will pass every request to the existing origin unless the request is `GET` or `HEAD`, targets `/` or `/index.html`, and has an acceptable `text/markdown` media range. Matching requests fetch `/index.md`, set the Markdown content type, add `Accept` to `Vary`, and fall back to the original request on origin failure.

**Tech Stack:** Cloudflare Workers, Wrangler 4.113.0, JavaScript ES modules, Node.js built-in test runner.

## Global Constraints

- Normal browser requests must continue to receive the existing HTML response.
- Do not modify `index.html`, `index.css`, `index.js`, `_headers`, `_redirects`, `index.md`, or `mac-brain-worker`.
- Do not create a database, secret, binding, or public `workers.dev` endpoint.
- Markdown negotiation applies only to `/` and `/index.html`; all other paths remain pass-through.
- `text/markdown;q=0` is not an affirmative Markdown request.
- Do not deploy until unit tests and Wrangler dry-run validation pass.

---

### Task 1: Add the request-negotiation handler with tests first

**Files:**
- Create: `cloudflare/markdown-negotiation-worker/package.json`
- Create: `cloudflare/markdown-negotiation-worker/src/index.js`
- Test: `cloudflare/markdown-negotiation-worker/test/index.test.mjs`

**Interfaces:**
- Produces `acceptsMarkdown(acceptHeader)` for media-range parsing and `handleRequest(request, fetchImpl)` for deterministic request handling.
- The default Worker export is `{ fetch(request) { return handleRequest(request); } }`.

- [ ] **Step 1: Write the failing tests**

Create `package.json` with `{ "private": true, "type": "module" }`, then create tests that import `handleRequest` before the source exists. The tests must cover the following exact behaviors:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/index.js";

function response(body, headers = {}, status = 200) {
  return new Response(body, { status, headers });
}

function request(path = "/", init = {}) {
  return new Request(`https://jaybharti.me${path}`, init);
}

test("passes normal browser requests through unchanged", async () => {
  const original = response("<html>site</html>", { "Content-Type": "text/html; charset=utf-8" });
  const calls = [];
  const result = await handleRequest(request("/"), async (outgoing) => {
    calls.push(outgoing.url);
    return original;
  });

  assert.equal(result, original);
  assert.deepEqual(calls, ["https://jaybharti.me/"]);
});

test("returns index.md for an explicit Markdown request", async () => {
  const markdown = response("# Jay Bharti\n", {
    "Content-Type": "text/markdown",
    "Vary": "Accept-Encoding",
    "x-markdown-tokens": "4"
  });
  const calls = [];
  const result = await handleRequest(
    request("/", { headers: { Accept: "text/markdown" } }),
    async (outgoing) => {
      calls.push(outgoing.url);
      return markdown;
    }
  );

  assert.equal(await result.text(), "# Jay Bharti\n");
  assert.equal(result.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(result.headers.get("Vary"), "Accept-Encoding, Accept");
  assert.equal(result.headers.get("x-markdown-tokens"), "4");
  assert.deepEqual(calls, ["https://jaybharti.me/index.md"]);
});

test("accepts Markdown in a mixed Accept header and on index.html", async () => {
  const calls = [];
  const result = await handleRequest(
    request("/index.html?view=profile", {
      headers: { Accept: "text/html;q=0.8, text/markdown; q=0.9" }
    }),
    async (outgoing) => {
      calls.push(outgoing.url);
      return response("# Profile", { "Content-Type": "text/plain" });
    }
  );

  assert.equal(result.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.deepEqual(calls, ["https://jaybharti.me/index.md"]);
});

test("does not negotiate Markdown when its quality is zero", async () => {
  const calls = [];
  const original = response("<html>site</html>", { "Content-Type": "text/html" });
  const result = await handleRequest(
    request("/", { headers: { Accept: "text/markdown;q=0, text/html" } }),
    async (outgoing) => {
      calls.push(outgoing.url);
      return original;
    }
  );

  assert.equal(result, original);
  assert.deepEqual(calls, ["https://jaybharti.me/"]);
});

test("leaves non-root paths and non-GET methods unchanged", async () => {
  const original = response("unchanged");
  for (const [path, method] of [["/meridian", "GET"], ["/", "POST"]]) {
    const calls = [];
    const result = await handleRequest(
      request(path, { method, headers: { Accept: "text/markdown" } }),
      async (outgoing) => {
        calls.push(`${outgoing.method} ${outgoing.url}`);
        return original;
      }
    );
    assert.equal(result, original);
    assert.deepEqual(calls, [`${method} https://jaybharti.me${path}`]);
  }
});

test("falls back to the original request when index.md cannot be fetched", async () => {
  const calls = [];
  const original = response("<html>fallback</html>", { "Content-Type": "text/html" });
  const result = await handleRequest(
    request("/", { headers: { Accept: "text/markdown" } }),
    async (outgoing) => {
      calls.push(outgoing.url);
      if (outgoing.url.endsWith("/index.md")) throw new Error("origin unavailable");
      return original;
    }
  );

  assert.equal(result, original);
  assert.deepEqual(calls, ["https://jaybharti.me/index.md", "https://jaybharti.me/"]);
});
```

- [ ] **Step 2: Run the focused test to verify it fails for the missing Worker module**

Run from the repository root:

```bash
node --test cloudflare/markdown-negotiation-worker/test/index.test.mjs
```

Expected: the test command fails because `cloudflare/markdown-negotiation-worker/src/index.js` does not exist yet.

- [ ] **Step 3: Write the minimal Worker implementation**

Create `src/index.js` with these behaviors:

```js
const MARKDOWN_PATHS = new Set(["/", "/index.html"]);

export function acceptsMarkdown(acceptHeader = "") {
  return acceptHeader.split(",").some((range) => {
    const [mediaType, ...parameters] = range.split(";");
    if (mediaType.trim().toLowerCase() !== "text/markdown") return false;

    const quality = parameters
      .map((parameter) => parameter.trim().toLowerCase())
      .find((parameter) => parameter.startsWith("q="));

    return quality === undefined || Number(quality.slice(2)) > 0;
  });
}

function withAcceptInVary(varyHeader) {
  const values = (varyHeader ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values.some((value) => value.toLowerCase() === "accept")) values.push("Accept");
  return values.join(", ");
}

export async function handleRequest(request, fetchImpl = fetch) {
  const url = new URL(request.url);
  const methodCanNegotiate = request.method === "GET" || request.method === "HEAD";
  const shouldNegotiate = methodCanNegotiate && MARKDOWN_PATHS.has(url.pathname)
    && acceptsMarkdown(request.headers.get("Accept") ?? "");

  if (!shouldNegotiate) return fetchImpl(request);

  const markdownUrl = new URL("/index.md", request.url);
  const markdownRequest = new Request(markdownUrl, request);

  try {
    const markdownResponse = await fetchImpl(markdownRequest);
    if (!markdownResponse.ok) return fetchImpl(request);

    const headers = new Headers(markdownResponse.headers);
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.set("Vary", withAcceptInVary(headers.get("Vary")));

    return new Response(request.method === "HEAD" ? null : markdownResponse.body, {
      status: markdownResponse.status,
      statusText: markdownResponse.statusText,
      headers
    });
  } catch {
    return fetchImpl(request);
  }
}

export default {
  fetch(request) {
    return handleRequest(request);
  }
};
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
node --test cloudflare/markdown-negotiation-worker/test/index.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit the tested handler**

```bash
git add cloudflare/markdown-negotiation-worker/package.json cloudflare/markdown-negotiation-worker/src/index.js cloudflare/markdown-negotiation-worker/test/index.test.mjs
git commit -m "feat: add markdown negotiation worker handler"
```

### Task 2: Add the pinned Wrangler route configuration

**Files:**
- Create: `cloudflare/markdown-negotiation-worker/wrangler.jsonc`

- [ ] **Step 1: Add the deployment configuration**

Create this JSONC configuration:

```jsonc
{
  "$schema": "../../capexiq/node_modules/wrangler/config-schema.json",
  "name": "jaybharti-markdown-negotiation",
  "main": "src/index.js",
  "compatibility_date": "2026-08-10",
  "account_id": "b61f01a19dd1aeb2fba1bafeb0282872",
  "workers_dev": false,
  "route": {
    "pattern": "jaybharti.me/*",
    "zone_name": "jaybharti.me"
  }
}
```

- [ ] **Step 2: Validate the Worker bundle without uploading or changing Cloudflare state**

Run:

```bash
cd cloudflare/markdown-negotiation-worker
../../capexiq/node_modules/.bin/wrangler deploy --dry-run --strict
```

Expected: Wrangler bundles the Worker successfully and reports a dry run without an upload.

- [ ] **Step 3: Commit the configuration**

```bash
cd ../..
git add cloudflare/markdown-negotiation-worker/wrangler.jsonc
git commit -m "chore: configure markdown negotiation worker route"
```

### Task 3: Deploy and verify the live contract

**Files:**
- No source files; verify the deployed Worker and existing site.

- [ ] **Step 1: Deploy the Worker and route from the pinned configuration**

Run:

```bash
cd cloudflare/markdown-negotiation-worker
../../capexiq/node_modules/.bin/wrangler deploy --strict
```

Expected: Cloudflare reports a successful deployment for `jaybharti-markdown-negotiation` and the `jaybharti.me/*` route.

- [ ] **Step 2: Verify ordinary browser behavior**

Run:

```bash
curl -fsSL --max-time 30 -D /tmp/jaybharti-html.headers -o /tmp/jaybharti-html.body https://jaybharti.me/
test "$(awk -F': ' 'tolower($1) == "content-type" {print tolower($2); exit}' /tmp/jaybharti-html.headers)" = "text/html; charset=utf-8\r" || test "$(awk -F': ' 'tolower($1) == "content-type" {print tolower($2); exit}' /tmp/jaybharti-html.headers)" = "text/html; charset=utf-8"
rg -q '<html' /tmp/jaybharti-html.body
```

Expected: HTTP 200, HTML content type, and an HTML body containing `<html`.

- [ ] **Step 3: Verify explicit Markdown behavior**

Run:

```bash
curl -fsSL --max-time 30 -H 'Accept: text/markdown' -D /tmp/jaybharti-markdown.headers -o /tmp/jaybharti-markdown.body https://jaybharti.me/
rg -qi '^content-type: text/markdown; charset=utf-8' /tmp/jaybharti-markdown.headers
rg -q '^# Jay Bharti' /tmp/jaybharti-markdown.body
! rg -q '<html' /tmp/jaybharti-markdown.body
```

Expected: HTTP 200, Markdown content type, the existing profile Markdown, and no HTML document wrapper.

- [ ] **Step 4: Verify the fallback and path boundary live**

Run:

```bash
curl -fsSL --max-time 30 -H 'Accept: text/html' https://jaybharti.me/ | rg -q '<html'
curl -fsSL --max-time 30 -H 'Accept: text/markdown' https://jaybharti.me/meridian | rg -q '<html'
```

Expected: an ordinary HTML request remains HTML, and a Markdown request to a non-root project path remains the original HTML response.

- [ ] **Step 5: Check the deployed resource and clean local verification artifacts**

Run:

```bash
cd ../..
git status --short
rm -f /tmp/jaybharti-html.headers /tmp/jaybharti-html.body /tmp/jaybharti-markdown.headers /tmp/jaybharti-markdown.body
```

Expected: only the intended Worker/design/plan commits are present in Git, and no repository files were modified by live verification.
