/**
 * Sitemap XML Validator
 * Validates XML well-formedness, sitemap schema compliance, ISO 8601 timestamps, priorities, and canonical URLs.
 */

const VALID_CHANGEFREQ = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never"
]);

const ISO_8601_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/;

export function parseSitemapXml(xmlContent) {
  if (typeof xmlContent !== "string") {
    throw new TypeError("Sitemap XML content must be a string");
  }

  const errors = [];
  const urls = [];
  const seenLocs = new Set();

  // Basic well-formedness check
  if (!xmlContent.includes("<urlset")) {
    errors.push("Missing root <urlset> element");
    return { valid: false, errors, urls };
  }

  if (!xmlContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') &&
      !xmlContent.includes("xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'")) {
    errors.push('Missing or invalid xmlns namespace on <urlset>: expected "http://www.sitemaps.org/schemas/sitemap/0.9"');
  }

  // Extract <url>...</url> blocks using regex
  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/gi;
  let match;
  let urlIndex = 0;

  while ((match = urlBlockRegex.exec(xmlContent)) !== null) {
    urlIndex++;
    const block = match[1];

    const locMatch = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(block);
    const lastmodMatch = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i.exec(block);
    const changefreqMatch = /<changefreq>\s*([^<\s]+)\s*<\/changefreq>/i.exec(block);
    const priorityMatch = /<priority>\s*([^<\s]+)\s*<\/priority>/i.exec(block);

    if (!locMatch) {
      errors.push(`URL #${urlIndex}: Missing required <loc> tag`);
      continue;
    }

    const loc = locMatch[1].trim();

    // Check duplicate
    if (seenLocs.has(loc)) {
      errors.push(`Duplicate URL detected: "${loc}"`);
    }
    seenLocs.add(loc);

    // Validate loc format
    try {
      const parsedUrl = new URL(loc);
      if (parsedUrl.protocol !== "https:") {
        errors.push(`URL "${loc}": protocol must be https:`);
      }
    } catch {
      errors.push(`URL "${loc}": Invalid absolute URL syntax`);
    }

    // Validate lastmod
    let lastmod = null;
    if (lastmodMatch) {
      lastmod = lastmodMatch[1].trim();
      if (!ISO_8601_DATE_REGEX.test(lastmod)) {
        errors.push(`URL "${loc}": Invalid lastmod format "${lastmod}", must be ISO 8601 (YYYY-MM-DD)`);
      } else {
        const parsedDate = Date.parse(lastmod);
        if (Number.isNaN(parsedDate)) {
          errors.push(`URL "${loc}": Unparseable date in lastmod "${lastmod}"`);
        }
      }
    }

    // Validate changefreq
    let changefreq = null;
    if (changefreqMatch) {
      changefreq = changefreqMatch[1].trim().toLowerCase();
      if (!VALID_CHANGEFREQ.has(changefreq)) {
        errors.push(`URL "${loc}": Invalid changefreq "${changefreq}", must be one of: ${Array.from(VALID_CHANGEFREQ).join(", ")}`);
      }
    }

    // Validate priority
    let priority = null;
    if (priorityMatch) {
      priority = parseFloat(priorityMatch[1].trim());
      if (Number.isNaN(priority) || priority < 0.0 || priority > 1.0) {
        errors.push(`URL "${loc}": Invalid priority "${priorityMatch[1]}", must be a float between 0.0 and 1.0`);
      }
    }

    urls.push({
      loc,
      lastmod,
      changefreq,
      priority
    });
  }

  if (urls.length === 0) {
    errors.push("Sitemap contains zero <url> entries");
  }

  return {
    valid: errors.length === 0,
    errors,
    urls,
    count: urls.length
  };
}

export function validateRequiredSitemapUrls(parsedSitemap, requiredUrls = []) {
  const defaultRequired = [
    "https://jaybharti.me/",
    "https://jaybharti.me/index.md",
    "https://jaybharti.me/llms.txt"
  ];
  const toCheck = requiredUrls.length > 0 ? requiredUrls : defaultRequired;
  const missing = [];

  const locs = new Set(parsedSitemap.urls.map(u => u.loc));
  for (const req of toCheck) {
    if (!locs.has(req)) {
      missing.push(req);
    }
  }

  return {
    passed: missing.length === 0,
    missing
  };
}
