# Markdown Content Negotiation Design

## Goal

Make `https://jaybharti.me/` return the existing Markdown profile when an agent explicitly requests `Accept: text/markdown`, while preserving the existing HTML response for browsers and all other requests.

## Context

The portfolio is a static GitHub Pages site proxied through the Cloudflare zone `jaybharti.me`. The repository already contains `index.md`, which is the intended agent-readable representation. Cloudflare's native Markdown for Agents converter cannot be enabled on the current Free Website plan, so the implementation will use a separate Worker route rather than changing the site source or the existing `mac-brain-worker`.

## Architecture

Create a new Worker named `jaybharti-markdown-negotiation` with a single route covering `jaybharti.me/*`. The Worker will be a transparent pass-through unless all of these conditions hold:

1. The method is `GET` or `HEAD`.
2. The path is `/` or `/index.html`.
3. The `Accept` header contains an acceptable `text/markdown` media range (`q=0` is not acceptable).

For a matching request, the Worker fetches `/index.md` from the existing origin and returns its body with `Content-Type: text/markdown; charset=utf-8`. It preserves origin headers, adds `Accept` to `Vary`, and forwards an existing token-count header if one is present. If the Markdown origin fetch fails, the Worker falls back to the original HTML request so the new route cannot turn a normal page request into a site error.

All other requests call `fetch(request)` directly. This keeps the browser path, project pages, assets, redirects, and non-GET requests on the existing origin behavior.

## Request flow

```text
request to jaybharti.me
          |
          v
  GET/HEAD + / or /index.html + Accept includes text/markdown?
        /                         \
      yes                          no
       |                            |
       v                            v
 fetch /index.md              fetch original request
       |
       v
 Markdown response; on failure, fallback to original HTML
```

## Error handling and safety

- No HTML source, CSS, JavaScript, redirects, or existing Worker code will be modified.
- The new Worker will not use a database, secret, binding, or mutable global request state.
- Browser requests retain the original response body and status because they use the pass-through path.
- Markdown requests are limited to the root profile representation; project pages remain unchanged.
- The route will be deployed only after unit tests and a Wrangler dry run pass.
- Live verification will compare default and Markdown responses, including status, content type, body shape, and the unchanged visual HTML source path.

## Testing

Tests will exercise the Worker handler with a real fetch stub for the origin boundary:

- no `Accept` header returns the original HTML response;
- `Accept: text/html` returns the original HTML response;
- `Accept: text/markdown` returns Markdown with the expected content type and `Vary` behavior;
- mixed `Accept` values and a positive quality value select Markdown;
- `text/markdown;q=0` does not select Markdown;
- `/index.html` supports Markdown negotiation;
- non-root paths remain pass-through;
- non-GET methods remain pass-through;
- a failed `/index.md` fetch falls back to the original request.

## Deployment and rollback

The Worker configuration will be versioned in `cloudflare/markdown-negotiation-worker/wrangler.jsonc`. Wrangler will deploy the Worker and route from that source of truth. If live verification finds a regression, the route can be removed or the Worker can be rolled back without changing the GitHub Pages site.
