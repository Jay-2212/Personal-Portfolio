import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/index.js";

function response(body, headers = {}, status = 200) {
  return new Response(body, { status, headers });
}

function request(path = "/", init = {}) {
  return new Request(`https://jaybharti.me${path}`, init);
}

const HOMEPAGE_LINKS = [
  '<https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '<https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '<https://jaybharti.me/>; rel="service-doc"; type="text/html"',
  '<https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown"'
].join(", ");

test("adds discovery links without changing the normal homepage HTML response", async () => {
  const original = response("<html>site</html>", { "Content-Type": "text/html; charset=utf-8" });
  const calls = [];
  const result = await handleRequest(request("/"), async (outgoing) => {
    calls.push(outgoing.url);
    return original;
  });

  assert.notEqual(result, original);
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "<html>site</html>");
  assert.equal(result.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
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
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
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
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
  assert.deepEqual(calls, ["https://jaybharti.me/index.md"]);
});

test("returns headers without a body for a Markdown HEAD request", async () => {
  const calls = [];
  const result = await handleRequest(
    request("/", { method: "HEAD", headers: { Accept: "text/markdown" } }),
    async (outgoing) => {
      calls.push(`${outgoing.method} ${outgoing.url}`);
      return response("# Jay Bharti\n", { "Content-Type": "text/markdown" });
    }
  );

  assert.equal(result.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(await result.text(), "");
  assert.deepEqual(calls, ["HEAD https://jaybharti.me/index.md"]);
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

  assert.notEqual(result, original);
  assert.equal(await result.text(), "<html>site</html>");
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
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

  assert.notEqual(result, original);
  assert.equal(await result.text(), "<html>fallback</html>");
  assert.equal(result.headers.get("Link"), HOMEPAGE_LINKS);
  assert.deepEqual(calls, ["https://jaybharti.me/index.md", "https://jaybharti.me/"]);
});

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
