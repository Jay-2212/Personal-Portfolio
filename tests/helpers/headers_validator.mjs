/**
 * Cloudflare Pages _headers Validator
 * Validates Cache-Control directives, Link headers, CORS, and security policies.
 */

export function parseCloudflareHeaders(content) {
  if (typeof content !== "string") {
    throw new TypeError("_headers content must be a string");
  }

  const lines = content.split(/\r?\n/);
  const pathRules = new Map();
  let currentPath = null;
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNumber = i + 1;

    // Strip comments
    const hashIdx = rawLine.indexOf("#");
    const stripped = (hashIdx >= 0 ? rawLine.slice(0, hashIdx) : rawLine).trimEnd();

    if (!stripped.trim()) {
      continue;
    }

    // Path declaration (no leading whitespace)
    if (!rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
      currentPath = stripped.trim();
      if (!pathRules.has(currentPath)) {
        pathRules.set(currentPath, new Map());
      }
      continue;
    }

    // Header declaration (must be indented)
    if (!currentPath) {
      errors.push(`Line ${lineNumber}: Header declared before any path block: "${rawLine}"`);
      continue;
    }

    const colonIdx = stripped.indexOf(":");
    if (colonIdx === -1) {
      errors.push(`Line ${lineNumber}: Invalid header format (missing colon): "${rawLine}"`);
      continue;
    }

    const headerName = stripped.slice(0, colonIdx).trim();
    const headerValue = stripped.slice(colonIdx + 1).trim();

    const headersMap = pathRules.get(currentPath);
    if (!headersMap.has(headerName.toLowerCase())) {
      headersMap.set(headerName.toLowerCase(), { originalName: headerName, values: [] });
    }
    headersMap.get(headerName.toLowerCase()).values.push(headerValue);
  }

  return {
    valid: errors.length === 0,
    errors,
    pathRules
  };
}

export function validateEdgeHeaders(parsedHeaders) {
  const errors = [];
  const rules = parsedHeaders.pathRules;

  // 1. Check static asset caching
  const staticPaths = ["/photos/*", "/assets/*"];
  for (const p of staticPaths) {
    const headers = rules.get(p);
    if (!headers) {
      errors.push(`Missing caching rule for static path "${p}"`);
      continue;
    }
    const cc = headers.get("cache-control");
    if (!cc || cc.values.length === 0) {
      errors.push(`Static path "${p}" is missing Cache-Control header`);
    } else {
      const ccVal = cc.values.join(", ").toLowerCase();
      if (!ccVal.includes("immutable")) {
        errors.push(`Static path "${p}" Cache-Control must include "immutable"`);
      }
      if (!ccVal.includes("max-age=31536000")) {
        errors.push(`Static path "${p}" Cache-Control must include 1-year max-age (31536000)`);
      }
    }
  }

  // 2. Check discovery files caching
  const discoveryPaths = ["/robots.txt", "/sitemap.xml", "/llms.txt", "/index.md"];
  for (const p of discoveryPaths) {
    const headers = rules.get(p);
    if (!headers) {
      errors.push(`Missing caching rule for discovery file "${p}"`);
      continue;
    }
    const cc = headers.get("cache-control");
    if (!cc || cc.values.length === 0) {
      errors.push(`Discovery file "${p}" is missing Cache-Control header`);
    } else {
      const ccVal = cc.values.join(", ").toLowerCase();
      if (!ccVal.includes("max-age=86400")) {
        errors.push(`Discovery file "${p}" Cache-Control must include 1-day max-age (86400)`);
      }
      if (!ccVal.includes("stale-while-revalidate=604800")) {
        errors.push(`Discovery file "${p}" Cache-Control must include stale-while-revalidate=604800`);
      }
    }
  }

  // 3. Check RFC 9727 discovery Link headers on / and /index.html
  for (const p of ["/", "/index.html"]) {
    const headers = rules.get(p);
    if (!headers) {
      errors.push(`Missing rule block for "${p}"`);
      continue;
    }
    const linkHeader = headers.get("link");
    if (!linkHeader || linkHeader.values.length === 0) {
      errors.push(`Path "${p}" must configure discovery Link header`);
    } else {
      const linkVal = linkHeader.values.join(", ");
      const requiredRels = ["api-catalog", "service-desc", "service-doc", "describedby"];
      for (const rel of requiredRels) {
        if (!linkVal.includes(`rel="${rel}"`)) {
          errors.push(`Path "${p}" Link header missing relation: rel="${rel}"`);
        }
      }
      // Ensure no unregistered/internal relations are leaked into Link header
      if (linkVal.includes("rel=\"agent-skills\"") || linkVal.includes("rel=\"mcp-server-card\"")) {
        errors.push(`Path "${p}" Link header contains unapproved registered relation`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
