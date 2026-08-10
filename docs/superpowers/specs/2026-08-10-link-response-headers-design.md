# Homepage Link Response Headers Design

## Goal

Advertise the portfolio's existing machine-readable discovery resources from the
canonical homepage response using registered HTTP `Link` relation types, while
leaving normal human navigation and the rendered HTML page unchanged.

## Context

The canonical site is `https://jaybharti.me`. The existing Cloudflare Worker is
routed for `jaybharti.me/*` and already handles Markdown content negotiation and
the RFC 9727 API catalog. A live `GET /` currently returns the normal HTML page
but no `Link` header. The static `_headers` file is retained as a host-compatible
fallback, but the Worker is the authoritative path for the live GitHub Pages
origin.

Existing resources:

- `/.well-known/api-catalog` — RFC 9727 Linkset API catalog.
- `/.well-known/portfolio-api.json` — OpenAPI 3.1 service description.
- `/` — human-readable portfolio homepage and service documentation.
- `/index.md` — Markdown representation of the portfolio profile.

## Approaches considered

1. A Cloudflare Response Header Transform Rule would be a small dashboard/API
   configuration, but it would not live with the Worker tests or source changes.
2. The static `_headers` file alone would be simple, but the live GitHub Pages
   origin currently does not emit those rules.
3. Extending the existing Worker keeps the behavior version-controlled,
   testable, and deployed at the edge already in front of the site. This is the
   chosen approach, with `_headers` aligned as a fallback.

## Chosen design

For `GET` and `HEAD` requests to `/` and `/index.html`, the Worker will fetch
the origin response and return the same status, status text, content type,
body, and other response headers, adding one comma-separated `Link` header:

```text
<https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json",
<https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json",
<https://jaybharti.me/>; rel="service-doc"; type="text/html",
<https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown"
```

The response body is streamed through rather than buffered. `HEAD` responses
remain bodyless. Explicit Markdown requests to the homepage continue to fetch
and return `/index.md` with `Content-Type: text/markdown; charset=utf-8`, now
with the same discovery header. Non-homepage paths, non-GET/HEAD methods, the
API catalog branch, and all existing fallback behavior remain unchanged.

The root and `/index.html` `_headers` rules will use the same four registered
relations. Existing unregistered token relations in those fallback rules will
be removed from the response header; their underlying resources remain
available at their existing URLs.

## Testing and verification

Test-first changes will add Worker tests for homepage GET, homepage HEAD,
Markdown negotiation with discovery links, and pass-through behavior outside
the homepage. The focused Worker suite and a Wrangler dry run will run before
deployment. After deployment, verification will inspect live HTML and Markdown
responses, confirm the exact registered relations and preserved content, and
run the requested `isitagentready.com/api/scan` check until
`checks.discoverability.linkHeaders.status` is `pass`.

## Non-goals

- No HTML, CSS, JavaScript, or page content changes.
- No new public write endpoint, secret, binding, or mutable request state.
- No changes to the API catalog body or existing Markdown semantics.
- No header changes on unrelated site paths.
