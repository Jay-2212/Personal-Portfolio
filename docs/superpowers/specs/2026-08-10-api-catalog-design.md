# API Catalog Design

## Goal

Publish the portfolio's existing public, read-only profile endpoint through an RFC 9727 API catalog without changing normal browser navigation or the rendered website.

## Context

The canonical site is `https://jaybharti.me`. The repository already publishes `/.well-known/api-catalog`, but its current `services` document is not the RFC 9727 Linkset format. GitHub Pages serves the extensionless catalog file as `application/octet-stream`, so the already-deployed Cloudflare Worker will apply the required Linkset media type only to this well-known path.

The site has one appropriate public API-like resource to advertise: the root profile endpoint. It returns the normal HTML page to browsers and the existing Markdown profile when a client explicitly requests `text/markdown`.

## Chosen approach

Keep the catalog as a static file and add a small OpenAPI 3.1 JSON document for the root profile endpoint. Extend the existing Worker with a narrowly scoped catalog branch that passes through the origin body and status while replacing only the response `Content-Type`. This keeps the change independent of the HTML site and avoids adding a new route, database, secret, or public mutation surface.

The catalog will contain one Linkset entry:

- `anchor`: `https://jaybharti.me/`
- `service-desc`: `https://jaybharti.me/.well-known/portfolio-api.json`, typed as an OpenAPI JSON document
- `service-doc`: `https://jaybharti.me/`, typed as HTML

No `status` relation will be included because the site has no dedicated health endpoint. The catalog's response will use `application/linkset+json` with the RFC 9727 profile parameter.

## Request behavior

```text
ordinary browser request              -> existing origin response unchanged
GET/HEAD /.well-known/api-catalog     -> existing catalog body + RFC Linkset Content-Type
GET/HEAD / with Accept: text/markdown  -> existing Worker Markdown behavior unchanged
all other paths and methods            -> existing origin response unchanged
```

The Worker will not rewrite the catalog body, redirect visitors, alter the root HTML response, or change the existing Markdown negotiation logic. A catalog-origin failure will fall back to the original request, matching the existing Worker's safe pass-through behavior.

## Testing

Unit tests will cover the catalog GET response, catalog HEAD response, and pass-through behavior for non-catalog requests and methods. A JSON validation check will assert the `linkset` array, absolute `anchor`, `service-desc`, and `service-doc` links. The implementation will then be checked with a Wrangler dry run, live HTTP headers/body checks, and the requested `isitagentready.com/api/scan` call.

## References

- [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727.html), especially Sections 4.1–4.2 and Appendix A.1.
- [RFC 9264](https://www.rfc-editor.org/rfc/rfc9264.html), Linkset media type and structure.
