/**
 * Schema.org JSON-LD Structure and Graph Validator
 * Validates Schema.org @context, @graph array, node types, relationships, and sameAs authorities.
 */

export function parseJsonLdFromHtml(html) {
  const scriptRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw);
      blocks.push(parsed);
    } catch (err) {
      throw new SyntaxError(`Malformed JSON-LD script block: ${err.message}\nContent snippet: ${raw.slice(0, 100)}`);
    }
  }
  return blocks;
}

export function validateSchemaGraph(jsonOrGraph) {
  const errors = [];
  const nodesByType = new Map();

  let context = null;
  let nodes = [];

  if (Array.isArray(jsonOrGraph)) {
    // Array of blocks
    for (const block of jsonOrGraph) {
      if (block["@context"]) {
        context = block["@context"];
      }
      if (Array.isArray(block["@graph"])) {
        nodes.push(...block["@graph"]);
      } else {
        nodes.push(block);
      }
    }
  } else if (typeof jsonOrGraph === "object" && jsonOrGraph !== null) {
    context = jsonOrGraph["@context"];
    if (Array.isArray(jsonOrGraph["@graph"])) {
      nodes = jsonOrGraph["@graph"];
    } else {
      nodes = [jsonOrGraph];
    }
  } else {
    errors.push("Input must be a valid JSON-LD object or array of objects.");
    return { valid: false, errors, nodesByType: {} };
  }

  // Verify @context
  if (!context || !/^https?:\/\/schema\.org\/?$/.test(context)) {
    errors.push(`Invalid or missing @context: expected "https://schema.org", received "${context}"`);
  }

  if (nodes.length === 0) {
    errors.push("Empty Schema.org graph: no entity nodes found.");
  }

  // Index nodes by type
  for (const node of nodes) {
    if (!node || typeof node !== "object") {
      errors.push("Invalid node in graph: expected an object.");
      continue;
    }
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    for (const t of types) {
      if (!t) {
        errors.push(`Node is missing @type: ${JSON.stringify(node).slice(0, 80)}`);
        continue;
      }
      if (!nodesByType.has(t)) {
        nodesByType.set(t, []);
      }
      nodesByType.get(t).push(node);
    }
  }

  // Validate Person node
  const personNodes = nodesByType.get("Person") || [];
  if (personNodes.length === 0) {
    errors.push("Missing required Schema.org node: 'Person'");
  } else {
    const person = personNodes[0];
    if (!person.name || person.name !== "Jay Bharti") {
      errors.push(`Person.name must be 'Jay Bharti', received '${person.name}'`);
    }
    if (!person.url || !person.url.includes("jaybharti.me")) {
      errors.push(`Person.url must link to jaybharti.me, received '${person.url}'`);
    }
    if (!Array.isArray(person.sameAs) || person.sameAs.length === 0) {
      errors.push("Person.sameAs must be a non-empty array of authority profile URLs.");
    } else {
      const sameAsUrls = person.sameAs.join(" ");
      if (!sameAsUrls.includes("linkedin.com")) {
        errors.push("Person.sameAs is missing LinkedIn profile URL.");
      }
      if (!sameAsUrls.includes("x.com") && !sameAsUrls.includes("twitter.com")) {
        errors.push("Person.sameAs is missing Twitter/X profile URL.");
      }
      if (!sameAsUrls.includes("github.com/Jay-2212")) {
        errors.push("Person.sameAs is missing GitHub profile URL (https://github.com/Jay-2212).");
      }
    }
  }

  // Validate ProfilePage node
  const profilePages = nodesByType.get("ProfilePage") || [];
  if (profilePages.length === 0) {
    errors.push("Missing required Schema.org node: 'ProfilePage'");
  } else {
    const pp = profilePages[0];
    if (!pp.mainEntity) {
      errors.push("ProfilePage must have a mainEntity property linking to Person.");
    }
  }

  // Validate SoftwareApplication nodes
  const softwareApps = nodesByType.get("SoftwareApplication") || [];
  if (softwareApps.length === 0) {
    errors.push("Missing required Schema.org node: 'SoftwareApplication'");
  } else {
    const appNames = softwareApps.map(a => a.name);
    // At least CapexIQ or Mac Orchestrator or Meridian or Sensum
    const hasRecognizedApp = appNames.some(name =>
      ["CapexIQ", "Mac Orchestrator", "Meridian", "Sensum"].includes(name)
    );
    if (!hasRecognizedApp) {
      errors.push(`SoftwareApplication nodes must cover key portfolio projects, found: ${appNames.join(", ")}`);
    }
  }

  // Convert nodesByType Map to plain object for easy assertions
  const nodesRecord = {};
  for (const [key, val] of nodesByType.entries()) {
    nodesRecord[key] = val;
  }

  return {
    valid: errors.length === 0,
    errors,
    nodesByType: nodesRecord,
    nodeCount: nodes.length,
    graph: nodes
  };
}
