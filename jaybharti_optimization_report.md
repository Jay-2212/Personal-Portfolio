# Website Optimization Task List: jaybharti.me

## 1. Performance Optimizations (Priority: High)

### A. Image Compression & Resizing
The primary performance bottleneck is a single image payload.
* **Asset:** `/photos/main%20photo_holing%20qimpro%20winning%20trophy.jpg`
* **Current Size:** ~2.75 MB
* **Dimensions:** 4000x3000px (Scaled to 380x507px in UI)
* **Action Items:**
    1.  **Resize:** Scale the image down to a maximum width of 800px-1000px.
    2.  **Convert:** Encode the image in modern formats (**WebP** or **AVIF**).
    3.  **Implement Responsive Images:** Use `<picture>` tags or `srcset` to serve smaller versions for mobile.

### B. Eliminate Render-Blocking Resources
Estimated savings: **580ms**
* **Action Items:**
    1.  **CSS:** Inline critical CSS and defer `index.css` or use `media="print" onload="this.media='all'"` pattern.
    2.  **JS:** Ensure `index.js` and Cloudflare scripts use the `defer` or `async` attributes.
    3.  **Fonts:** Preconnect to `https://fonts.googleapis.com` and `https://fonts.gstatic.com`.

### C. Configure Caching
* **Issue:** Current Cache TTL for internal assets (images, CSS, JS) is only 4 hours.
* **Action Item:** Update `.htaccess` or Cloudflare Page Rules to set `Cache-Control: max-age=31536000` (1 year) for static assets, using content hashing for cache busting.

---

## 2. SEO Fixes (Priority: Medium)

### A. Repair robots.txt
* **Issue:** Line 29 contains an unknown directive: `Content-Signal: search=yes,ai-train=no`. 
* **Action Item:** Remove the non-standard directive or move it to a supported header/meta tag format if intended for specific crawlers. Ensure the file follows standard `Allow`/`Disallow` syntax.

---

## 3. Best Practices & Security (Priority: Medium)

Although the "Best Practices" score is 100, the following security headers are missing and should be implemented:
* **Content Security Policy (CSP):** Implement a policy to mitigate XSS.
* **HSTS:** Enable `Strict-Transport-Security`.
* **COOP/XFO:** Implement `Cross-Origin-Opener-Policy` and `X-Frame-Options` to prevent clickjacking and side-channel attacks.

---

## 4. Technical Audit Data Reference

| Metric | Value |
| :--- | :--- |
| **First Contentful Paint (FCP)** | 0.8 s |
| **Largest Contentful Paint (LCP)** | 0.8 s |
| **Total Blocking Time (TBT)** | 0 ms |
| **Cumulative Layout Shift (CLS)** | 0 |
| **Total Payload Size** | 2,973 KiB |

---

## 5. Accessibility (Excluding Contrast)
* **Status:** All other automated checks (ARIA attributes, Alt text, Document structure, Lang attributes) have **Passed**. No action required based on current constraints.
