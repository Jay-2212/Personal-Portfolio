/**
 * RFC 9309 Compliant robots.txt Parser & Validator
 * Checks syntax, allowed user agents, unknown directives, and sitemap references.
 */

const STANDARD_DIRECTIVES = new Set([
  "user-agent",
  "allow",
  "disallow",
  "sitemap",
  "crawl-delay",
  "clean-param",
  "host"
]);

export function parseRobotsTxt(content) {
  if (typeof content !== "string") {
    throw new TypeError("robots.txt content must be a string");
  }

  const lines = content.split(/\r?\n/);
  const errors = [];
  const unknownDirectives = [];
  const declaredAgents = new Set();
  const sitemaps = [];
  const records = [];

  let currentRecord = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNumber = i + 1;

    // Strip comments
    const hashIndex = rawLine.indexOf("#");
    const stripped = (hashIndex >= 0 ? rawLine.slice(0, hashIndex) : rawLine).trim();

    if (!stripped) {
      continue; // empty line
    }

    const colonIndex = stripped.indexOf(":");
    if (colonIndex === -1) {
      errors.push(`Line ${lineNumber}: Invalid robots.txt syntax (missing ':' separator): "${rawLine}"`);
      continue;
    }

    const directive = stripped.slice(0, colonIndex).trim().toLowerCase();
    const value = stripped.slice(colonIndex + 1).trim();

    if (!STANDARD_DIRECTIVES.has(directive)) {
      unknownDirectives.push({ line: lineNumber, directive, value, raw: rawLine });
      errors.push(`Line ${lineNumber}: Unknown or non-standard directive "${directive}": "${rawLine}"`);
      continue;
    }

    if (directive === "sitemap") {
      sitemaps.push(value);
      continue;
    }

    if (directive === "user-agent") {
      declaredAgents.add(value);
      if (!currentRecord || currentRecord.rules.length > 0) {
        currentRecord = { agents: [value], rules: [] };
        records.push(currentRecord);
      } else {
        currentRecord.agents.push(value);
      }
    } else if (directive === "allow" || directive === "disallow") {
      if (!currentRecord) {
        errors.push(`Line ${lineNumber}: Directive "${directive}" found before any User-agent declaration.`);
        continue;
      }
      currentRecord.rules.push({ type: directive, path: value, line: lineNumber });
    } else if (directive === "crawl-delay") {
      if (currentRecord) {
        currentRecord.crawlDelay = parseFloat(value);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    unknownDirectives,
    userAgents: Array.from(declaredAgents),
    sitemaps,
    records,
    lineCount: lines.length
  };
}

export function validateAiBotAllowance(parsedRobots, requiredBots = []) {
  const missingBots = [];
  const disallowedBots = [];

  const defaultBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bingbot"
  ];

  const botsToCheck = requiredBots.length > 0 ? requiredBots : defaultBots;

  for (const bot of botsToCheck) {
    const agentRecord = parsedRobots.records.find(r =>
      r.agents.some(a => a.toLowerCase() === bot.toLowerCase())
    );

    if (!agentRecord) {
      // Check if wildcard covers it
      const wildcardRecord = parsedRobots.records.find(r => r.agents.includes("*"));
      if (!wildcardRecord) {
        missingBots.push(bot);
      }
    } else {
      // Check if root '/' is explicitly disallowed
      const disallowsRoot = agentRecord.rules.some(rule =>
        rule.type === "disallow" && (rule.path === "/" || rule.path === "")
      );
      if (disallowsRoot) {
        disallowedBots.push(bot);
      }
    }
  }

  return {
    passed: missingBots.length === 0 && disallowedBots.length === 0,
    missingBots,
    disallowedBots
  };
}

export function canFetch(parsedRobots, userAgent, path = "/") {
  // Find record matching userAgent (case-insensitive) or fallback to '*'
  let matchingRecord = parsedRobots.records.find(r =>
    r.agents.some(a => a.toLowerCase() === userAgent.toLowerCase())
  );
  if (!matchingRecord) {
    matchingRecord = parsedRobots.records.find(r => r.agents.includes("*"));
  }
  if (!matchingRecord) {
    return true; // default allow
  }

  // Find longest matching rule
  let bestMatch = null;
  let bestLength = -1;

  for (const rule of matchingRecord.rules) {
    if (!rule.path) {
      if (rule.type === "disallow" && bestLength < 0) {
        bestMatch = "allow"; // Disallow with empty value means allow all
        bestLength = 0;
      }
      continue;
    }
    if (path.startsWith(rule.path)) {
      if (rule.path.length > bestLength) {
        bestLength = rule.path.length;
        bestMatch = rule.type;
      }
    }
  }

  if (bestMatch === "disallow") return false;
  return true;
}
