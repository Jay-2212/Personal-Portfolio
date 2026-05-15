# Updated Website Optimization Task List: jaybharti.me
**Date:** May 15, 2026
**Lighthouse Performance Score:** 87/100

---

## 1. Progress Report (Completed Tasks)
* **[✓] Image Optimization:** The main hero image has been successfully converted to WebP and reduced from ~2.75 MB to **182 KiB**. This is a massive improvement in payload size.

---

## 2. Pending Performance Optimizations (High Priority)

### A. Responsive Image Delivery
Even though the image is smaller, it's still being "overserved" for mobile devices.
* **Asset:** `/photos/main-photo-800w.webp`
* **Issue:** The image is 800px wide but displayed at 320px wide on mobile.
* **Action Items:**
    1.  Implement a `srcset` to serve a **400px wide** version specifically for mobile viewports.
    2.  Apply further compression (Lighthouse estimates another **42 KiB** savings).

### B. Eliminate Render-Blocking Resources
* **Estimated Savings:** **2,320 ms** (Significant impact on FCP/LCP).
* **Action Items:**
    1.  **Google Fonts:** The fonts are currently blocking the render for ~750ms. Use `font-display: swap` and ensure the CSS is loaded asynchronously.
    2.  **Cloudflare Script:** `/cloudflare-static/email-decode.min.js` is blocking the initial render. Add the `defer` attribute to this script tag.

### C. Leverage Browser Caching
* **Issue:** `index.css`, `index.js`, and the main photo have a Cache TTL of only **4 hours**.
* **Action Item:** Increase the `Cache-Control` max-age to at least 1 month (or 1 year with versioned filenames) via your hosting provider or Cloudflare settings.

---

## 3. SEO Fix (High Priority)

### A. Correct robots.txt Syntax
* **Issue:** Line 29 contains `Content-Signal: search=yes,ai-train=no`.
* **Error:** This is an "Unknown directive."
* **Action Item:** Remove this line or move it to a `<meta>` tag in the HTML head. Standard crawlers will ignore it or throw errors if it remains in `robots.txt`.

---

## 4. Technical Audit Metrics (Mobile)

| Metric | Value |
| :--- | :--- |
| **First Contentful Paint (FCP)** | 3.2 s |
| **Largest Contentful Paint (LCP)** | 3.2 s |
| **Total Blocking Time (TBT)** | 0 ms |
| **Speed Index** | 3.2 s |
| **Cumulative Layout Shift (CLS)** | 0.003 |

---

## 5. Accessibility & Best Practices
* **Accessibility (95):** Ignoring contrast ratio issues per user request. All other checks (ARIA, Alt text, structure) have **Passed**.
* **Best Practices (100):** Site is secure and using modern APIs.
