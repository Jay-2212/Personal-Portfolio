/**
 * HTML Guard & Zero-Regression Layout Validator
 * Verifies non-destructive DOM integrity, inlined critical CSS, lazy loading, and meta verification hook.
 */

const CORE_SECTION_IDS = [
  "nav",
  "hero",
  "about",
  "experience",
  "side-projects",
  "education",
  "skills",
  "awards"
];

export function validateHtmlIntegrity(htmlContent) {
  if (typeof htmlContent !== "string") {
    throw new TypeError("HTML content must be a string");
  }

  const errors = [];
  const sectionsFound = [];

  // Check head and body tags
  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(htmlContent);
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(htmlContent);

  if (!headMatch) {
    errors.push("Missing <head> element in HTML");
  }
  if (!bodyMatch) {
    errors.push("Missing <body> element in HTML");
  }

  const headContent = headMatch ? headMatch[1] : "";
  const bodyContent = bodyMatch ? bodyMatch[1] : "";

  // 1. Critical inlined CSS in head
  const styleMatch = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(headContent);
  let criticalCssFound = false;
  if (!styleMatch) {
    errors.push("Missing inlined critical <style> in <head>");
  } else {
    criticalCssFound = true;
    const css = styleMatch[1];
    if (!css.includes(":root") || !css.includes("--bg") || !css.includes("--text")) {
      errors.push("Inlined critical CSS is missing theme custom properties (:root)");
    }
  }

  // 2. Core section IDs in body
  for (const id of CORE_SECTION_IDS) {
    const idRegex = new RegExp(`id=["']${id}["']`, "i");
    if (idRegex.test(bodyContent) || idRegex.test(htmlContent)) {
      sectionsFound.push(id);
    } else {
      errors.push(`Missing core layout section: id="${id}"`);
    }
  }

  // 3. Check for Google Site Verification Hook in <head>
  const gscMatch = /<meta\s+name=["']google-site-verification["']\s+content=["']([^"']*)["'][^>]*>/i.exec(headContent);
  const verificationHookFound = !!gscMatch;

  // 4. Project image lazy loading & dimensions
  const imgTagRegex = /<img\s+[^>]*>/gi;
  let imgMatch;
  let imgCount = 0;
  let lazyCount = 0;
  let dimensionCount = 0;

  while ((imgMatch = imgTagRegex.exec(bodyContent)) !== null) {
    imgCount++;
    const tag = imgMatch[0];
    if (/loading=["']lazy["']/i.test(tag)) {
      lazyCount++;
    }
    if (/width=["']\d+["']/i.test(tag) && /height=["']\d+["']/i.test(tag)) {
      dimensionCount++;
    }
  }

  // 5. Canonical link in head
  const canonicalMatch = /<link\s+rel=["']canonical["']\s+href=["']https:\/\/jaybharti\.me\/["'][^>]*>/i.test(headContent);
  if (!canonicalMatch) {
    errors.push("Missing or invalid canonical link (<link rel=\"canonical\" href=\"https://jaybharti.me/\">)");
  }

  return {
    valid: errors.length === 0,
    errors,
    sectionsFound,
    criticalCssFound,
    verificationHookFound,
    imageMetrics: {
      totalImages: imgCount,
      lazyImages: lazyCount,
      dimensionedImages: dimensionCount
    }
  };
}
