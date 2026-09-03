# Cloudflare Edge Configuration & Optimization Guide

**Domain**: `https://jaybharti.me`  
**Purpose**: Comprehensive reference for Cloudflare Edge settings, caching architecture, worker routing, and AI bot discovery.  
**Companion Files**: `_headers`, `cloudflare/markdown-negotiation-worker/`

---

## 1. Edge Architecture Overview

The edge infrastructure for `https://jaybharti.me` operates across three tightly integrated layers:

```
[ Visitor / AI Crawler ]
           │
           ▼
[ Cloudflare Global Anycast Edge ]
  ├── HTTP/3 (QUIC) & 0-RTT TLS Resumption
  ├── Security Headers & WAF Bot Management
  ├── Smart Tiered Cache (95%+ Edge Hit Ratio)
  │
  ▼
[ Cloudflare Worker: jaybharti-markdown-negotiation ]
  ├── Routes: jaybharti.me/*
  ├── Content Negotiation: Accept: text/markdown -> /index.md
  ├── RFC 9727 API Catalog Linkset Discovery Injection
  ├── RFC 9727 Link Headers (api-catalog, service-desc, service-doc, describedby)
  │
  ▼
[ Origin Server: GitHub Pages / Cloudflare Pages ]
  └── Static assets, HTML, Markdown, LLM manifests, sitemaps
```

The static `_headers` file configures origin-declared cache semantics and security headers, while Cloudflare Dashboard settings enforce edge-level behaviors that cannot be declared inside Git repositories.

---

## 2. Recommended Cloudflare Dashboard Settings

### 2.1 Crawler Hints (IndexNow Integration)

- **Dashboard Navigation**:  
  `Dashboard -> jaybharti.me -> Caching -> Configuration -> Crawler Hints`  
  *(Alternative navigation: `Speed -> Optimization -> Content Optimization -> Crawler Hints`)*
- **Recommended Setting**: **Toggle ON**
- **Technical Explanation**:  
  Cloudflare Crawler Hints automatically integrates with the **IndexNow** protocol (supported by Microsoft Bing, Yandex, Seznam, and Naver). When enabled, every time Cloudflare purges edge cache or detects updated content, it sends an instantaneous push notification to search engines.
- **Benefits**:
  - Eliminates the days-to-weeks delay traditional crawlers take to discover updated pages.
  - Complements the repository's `scripts/ping_indexnow.sh` deployment hook with automatic edge-triggered notifications.
  - Drastically reduces origin bot crawl load by signaling exact URLs needing re-indexing.

---

### 2.2 Browser Cache TTL

- **Dashboard Navigation**:  
  `Dashboard -> jaybharti.me -> Caching -> Configuration -> Browser Cache TTL`
- **Recommended Setting**: **"Respect Existing Headers"**
- **Technical Explanation**:  
  By default, Cloudflare may apply a uniform TTL (such as 4 hours) to all HTTP responses, stripping or overriding origin `Cache-Control` directives. Setting this to "Respect Existing Headers" instructs the Cloudflare Edge to honor the exact `Cache-Control` max-age and directives specified in `_headers`.
- **Why This Is Critical**:
  - Ensures static assets in `/photos/*` and `/assets/*` maintain `max-age=31536000, immutable`.
  - Ensures discovery files (`/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/index.md`) maintain `max-age=86400, stale-while-revalidate=604800`.
  - Ensures root HTML (`/`) maintains fresh revalidation (`max-age=3600, stale-while-revalidate=86400`).

---

### 2.3 Early Hints (HTTP 103 Early Hints)

- **Dashboard Navigation**:  
  `Dashboard -> jaybharti.me -> Speed -> Optimization -> Content Optimization -> Early Hints`
- **Recommended Setting**: **Toggle ON**
- **Technical Explanation**:  
  When Early Hints is enabled, Cloudflare emits an asynchronous `HTTP 103 Early Hints` response to supporting browsers immediately upon receiving a request, before waiting for the origin or worker to assemble the full HTML body. The 103 response contains `Link: <...>; rel="preload"` and `rel="preconnect"` directives.
- **Benefits**:
  - Allows browsers to initiate DNS lookups, TLS negotiations, and asset downloads (e.g. `/index.css`, fonts, hero images) during the initial server think-time.
  - Shaves **200ms to 400ms** off First Contentful Paint (FCP) and Largest Contentful Paint (LCP), directly maximizing Core Web Vitals.

---

### 2.4 Tiered Cache (Smart Tiered Caching)

- **Dashboard Navigation**:  
  `Dashboard -> jaybharti.me -> Caching -> Tiered Cache`
- **Recommended Setting**: **Toggle ON** and select **"Smart Tiered Caching"**
- **Technical Explanation**:  
  Cloudflare features hundreds of edge data centers worldwide. Without Tiered Cache, a cache miss at any single regional PoP (Point of Presence) results in a request direct to origin. Smart Tiered Caching uses Cloudflare's Argo performance data to dynamically group edge data centers into a hierarchical topology: regional PoPs request from an optimized upper-tier caching data center before contacting the origin.
- **Benefits**:
  - Boosts global Edge Cache Hit Ratio to **95%+**.
  - Shields origin infrastructure from traffic spikes during sudden indexing crawls.
  - Decreases origin TTFB (Time to First Byte) across international regions.

---

### 2.5 AI Bot Management & WAF Rules

- **Dashboard Navigation**:  
  `Dashboard -> jaybharti.me -> Security -> Bots`  
  `Dashboard -> jaybharti.me -> Security -> WAF -> Custom Rules`
- **Recommended Setting**: **Allow verified AI crawlers and search indexers**
- **Technical Explanation**:  
  Cloudflare provides a 1-click feature called "Block AI Scrapers and Crawlers". While this feature protects against abusive scrapers, if configured indiscriminately, it can inadvertently block legitimate AI search engines and retrieval agents that power Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO).
- **Required Policy for Maximum Discoverability**:
  1. Do NOT enable blanket blocking of AI user agents on discovery and content routes.
  2. If using Cloudflare WAF Custom Rules, ensure explicit **Allow** / **Bypass** rules for verified search bots:
     - `GPTBot` (OpenAI training/search)
     - `OAI-SearchBot` (ChatGPT Search real-time indexer)
     - `ClaudeBot` (Anthropic search & retrieval)
     - `PerplexityBot` (Perplexity AI search engine)
     - `Google-Extended` (Google Gemini grounding)
     - `Applebot-Extended` (Apple Intelligence knowledge graph)
     - `Bingbot` (Microsoft Bing & Copilot)
  3. Example WAF Rule (Expression Editor):
     ```
     (http.user_agent contains "GPTBot" or
      http.user_agent contains "OAI-SearchBot" or
      http.user_agent contains "ClaudeBot" or
      http.user_agent contains "PerplexityBot" or
      http.user_agent contains "Google-Extended" or
      http.user_agent contains "Applebot-Extended" or
      http.user_agent contains "Bingbot")
     -> Action: Skip (Bypass Bot Management & WAF Challenges)
     ```

---

### 2.6 Protocol Optimization: HTTP/3 (QUIC) & 0-RTT Connection Resumption

- **Dashboard Navigation**:  
  - HTTP/3: `Dashboard -> jaybharti.me -> Speed -> Optimization -> Protocol Optimization -> HTTP/3 (with QUIC)`
  - 0-RTT: `Dashboard -> jaybharti.me -> SSL/TLS -> Edge Certificates -> 0-RTT Connection Resumption`
- **Recommended Setting**: **Toggle both ON**
- **Technical Explanation**:
  - **HTTP/3 (QUIC)** runs over UDP instead of TCP. It eliminates Head-of-Line (HoL) blocking when packet loss occurs on mobile or unstable networks, multiplexing independent data streams without cross-stream stalls.
  - **0-RTT (Zero Round-Trip Time)** allows clients that have previously connected to resume their TLS 1.3 session and transmit early application data (such as the initial HTTP GET request) on the very first round trip, eliminating an entire network round trip before response streaming begins.
- **Benefits**:
  - Dramatically improves mobile user experience and Core Web Vitals on high-latency cellular networks.
  - Provides instantaneous page load for repeat visitors.

---

### 2.7 Always Online™

- **Dashboard Navigation**:  
  `Dashboard -> jaybharti.me -> Caching -> Configuration -> Always Online`
- **Recommended Setting**: **Toggle ON**
- **Technical Explanation**:  
  In the rare event that origin servers (e.g. GitHub Pages) undergo maintenance or temporary routing downtime, Cloudflare serves stale cached copies of pages from edge cache and coordinates with the Internet Archive to ensure visitors never see a 502/504 error page.

---

## 3. Cloudflare Pages `_headers` Architecture

The `_headers` file in the repository root defines edge caching and HTTP security policies.

### 3.1 Policy Breakdown

| Path Pattern | Cache-Control Header | Purpose |
| :--- | :--- | :--- |
| `/*` | *(Security headers)* | Applies `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| `/` & `/index.html` | `public, max-age=3600, stale-while-revalidate=86400` | Fresh homepage content cached for 1 hour; serves stale up to 1 day while asynchronously refreshing in background. |
| `/photos/*` & `/assets/*` | `public, max-age=31536000, immutable` | Static binary assets (WebP hero images, screenshots, logos) cached for 1 year; browser skips revalidation requests entirely. |
| `/index.md` | `public, max-age=86400, stale-while-revalidate=604800` | Machine-readable markdown profile; 24-hour freshness with 7-day stale tolerance. `Vary: Accept` ensures correct edge caching. |
| `/llms.txt` | `public, max-age=86400, stale-while-revalidate=604800` | LLM discovery manifest; 24-hour freshness with 7-day stale tolerance. |
| `/robots.txt` | `public, max-age=86400, stale-while-revalidate=604800` | Crawler policy; eliminates excessive crawler origin polling while allowing rapid policy updates. |
| `/sitemap.xml` | `public, max-age=86400, stale-while-revalidate=604800` | XML sitemap; 24-hour fresh cache. |
| `/.well-known/*` | `public, max-age=86400, stale-while-revalidate=604800` | RFC 9727 API catalog, OpenAPI JSON, agent skills, and MCP server cards. |
| `/index.css` & `/index.js` | `public, max-age=86400, stale-while-revalidate=604800` | Application styling and client scripts; 1-day cache with 7-day SWR. |
| `/resume/*` | `public, max-age=604800, stale-while-revalidate=86400` | Resume PDFs; 7-day cache with 1-day SWR. |

### 3.2 RFC 9727 Discovery Link Header

Both `/` and `/index.html` expose RFC 9727 Link headers advertising the API catalog, OpenAPI specification, documentation, and alternate Markdown representation:

```http
Link: <https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", <https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", <https://jaybharti.me/>; rel="service-doc"; type="text/html", <https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown", <https://jaybharti.me/index.md>; rel="alternate"; type="text/markdown"
```

---

## 4. Cloudflare Worker: Markdown Negotiation

The worker in `cloudflare/markdown-negotiation-worker/` intercepts incoming traffic to `jaybharti.me/*`.

### 4.1 How It Works

1. **Quality-Aware Negotiation (`acceptsMarkdown`)**:
   - Parses the `Accept` header.
   - Standard browser requests (`text/html,application/xhtml+xml,...`) receive standard HTML.
   - Requests with `Accept: text/markdown` or mixed priority (e.g. `text/html;q=0.8, text/markdown;q=0.9`) are transparently routed to fetch `/index.md`.
   - Requests with `text/markdown;q=0` are treated as non-matching and receive HTML.
2. **RFC 9727 Link Injection (`withHomepageLinks`)**:
   - Ensures the discovery `Link` headers are present on both HTML responses and negotiated Markdown responses.
3. **Resilient Fallback**:
   - If the origin fetch for `/index.md` encounters a network error or non-200 status, the worker gracefully falls back to the original request, preventing client errors.
4. **HEAD Method Support**:
   - Handles `HEAD` requests cleanly by setting `body = null` while preserving all HTTP headers.

### 4.2 Running Worker Tests

The worker test suite uses the native Node.js test runner:

```bash
cd cloudflare/markdown-negotiation-worker
npm test
```

Expected output:
```
✔ publishes the portfolio API as an RFC 9727 Linkset
✔ publishes a valid OpenAPI description for the catalogued root endpoint
✔ adds discovery links without changing the normal homepage HTML response
✔ returns index.md for an explicit Markdown request
✔ accepts Markdown in a mixed Accept header and on index.html
✔ returns headers without a body for a Markdown HEAD request
✔ does not negotiate Markdown when its quality is zero
✔ leaves non-root paths and non-GET methods unchanged
✔ falls back to the original request when index.md cannot be fetched
✔ adds the same discovery links to an HTML homepage HEAD response without a body
✔ sets the RFC 9727 media type and Link header for the API catalog
✔ returns no body for an API catalog HEAD request while preserving status
✔ static homepage fallback advertises only the approved registered relations
ℹ tests 13, pass 13, fail 0
```

### 4.3 Testing Worker Deployment (Dry-Run)

To validate the worker bundle syntax and bindings before deploying:

```bash
npx wrangler deploy --dry-run --strict --config cloudflare/markdown-negotiation-worker/wrangler.jsonc
```

---

## 5. Live Edge Verification Guide

Use the following `curl` commands to verify edge optimizations in production:

### 5.1 Test Standard HTML Request
```bash
curl -sI https://jaybharti.me/
```
**Verify:**
- `content-type: text/html; charset=utf-8`
- `link:` contains `rel="api-catalog"`, `rel="service-desc"`, `rel="service-doc"`, `rel="describedby"`
- `strict-transport-security: max-age=31536000; includeSubDomains; preload`

### 5.2 Test Markdown Content Negotiation
```bash
curl -sI -H "Accept: text/markdown" https://jaybharti.me/
```
**Verify:**
- `content-type: text/markdown; charset=utf-8`
- `vary: Accept-Encoding, Accept`
- `link:` contains RFC 9727 links

### 5.3 Test Static Asset Caching
```bash
curl -sI https://jaybharti.me/photos/profile-headshot.webp
```
**Verify:**
- `cache-control: public, max-age=31536000, immutable`
- `cf-cache-status: HIT` (after initial request)

### 5.4 Test Discovery File Caching
```bash
curl -sI https://jaybharti.me/robots.txt
curl -sI https://jaybharti.me/sitemap.xml
curl -sI https://jaybharti.me/llms.txt
curl -sI https://jaybharti.me/index.md
```
**Verify:**
- `cache-control: public, max-age=86400, stale-while-revalidate=604800`

### 5.5 Test Security Headers
```bash
curl -sI https://jaybharti.me/ | grep -iE "(x-content-type-options|x-frame-options|referrer-policy)"
```
**Verify:**
- `x-content-type-options: nosniff`
- `x-frame-options: SAMEORIGIN`
- `referrer-policy: strict-origin-when-cross-origin`

---

## 6. Cloudflare Configuration Quick-Reference

| Feature | Location | Recommended Value | Primary Value |
| :--- | :--- | :--- | :--- |
| **Crawler Hints** | Caching -> Configuration | **ON** | Instant IndexNow push to Bing/Yandex/Seznam on content updates |
| **Browser Cache TTL** | Caching -> Configuration | **Respect Existing Headers** | Preserves 1-year immutable and 1-day discovery cache-control rules |
| **Early Hints (103)** | Speed -> Optimization | **ON** | Preloads CSS/assets while origin/worker generates body |
| **Smart Tiered Cache** | Caching -> Tiered Cache | **ON** | 95%+ edge cache hit ratio via regional caching hubs |
| **HTTP/3 (QUIC)** | Speed -> Optimization | **ON** | Zero HoL blocking and faster packet recovery on mobile |
| **0-RTT Resumption** | SSL/TLS -> Edge Certificates | **ON** | Zero round-trip connection resumption for returning visitors |
| **Always Online** | Caching -> Configuration | **ON** | Serves cached stale pages if origin encounters outage |
| **AI Bot Access** | Security -> Bots / WAF | **Allow / Bypass** | Uninhibited access for GPTBot, ClaudeBot, PerplexityBot, etc. |
