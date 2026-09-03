/**
 * Authoritative Specification Fixtures for jaybharti.me E2E Test Suite
 * Derived directly from ORIGINAL_REQUEST.md, PROJECT.md, and Survey Reports 1-3.
 */

export const SPEC_GEO_ANSWER_BLOCKS = {
  bio: "Jay Bharti is a Healthcare Administration specialist, developer, and data analyst based in Manipal, India. He holds a Master of Hospital Administration (8.88 CGPA) from MAHE and a B.Sc. in Biotechnology (8.81 CGPA). He is the National Winner of the 2025 QualTech® Prize for hospital process improvement and cold-chain supply engineering.",
  aiBackground: "Bharti integrates healthcare operations with modern agentic AI architecture, combining Lean Six Sigma (Yellow Belt, DMAIC) with RAG systems and Model Context Protocol (MCP). He develops open-source tools including CapexIQ (hospital capital expenditure financial assessment with WebMCP) and Mac Orchestrator (macOS MCP server), architecting hospital data pipelines to streamline operational and administrative decision-making.",
  capexiq: "CapexIQ is an open-source, browser-first decision-support platform for Indian healthcare administrators evaluating high-value capital equipment acquisitions. Developed by Jay Bharti, it converts vendor quotes and operating assumptions into automated ROI, NPV, IRR, payback period, and break-even metrics with formula-embedded Excel exports, featuring an interactive conversational WebMCP interface backed by 338+ automated Vitest tests.",
  qualtech: "In 2025, Jay Bharti led a 6-member quality improvement team at MAHE through a DMAIC cycle addressing sub-zero plasma bag breakage. Bharti engineered a patent-pending, anti-frost reusable cassette box with barcode scanning cutouts that reduced plasma bag breakage by 95%, saving ₹2.6 Lakhs annually and earning the National QualTech® Prize from the Qimpro Foundation at SAKCON."
};

export const SPEC_METRICS = [
  { metric: "95% reduction", context: "plasma bag breakage at sub-zero storage (-50°C)" },
  { metric: "₹2.6 Lakhs", context: "annual recurring savings" },
  { metric: "8.88 CGPA", context: "Master of Hospital Administration, MAHE" },
  { metric: "8.81 CGPA", context: "B.Sc. Biotechnology, MUJ" },
  { metric: "338+ tests", context: "automated Vitest suite in CapexIQ" },
  { metric: "20 tools", context: "streamlined MCP tools in Mac Orchestrator" }
];

export const SPEC_INSTITUTIONS = [
  "Qimpro Foundation",
  "SAKCON",
  "CAHO",
  "Manipal Academy of Higher Education",
  "Manipal University Jaipur",
  "Annexas Europe",
  "Rutgers University"
];

export const SPEC_AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot"
];

export const SPEC_ROBOTS_TXT = `# robots.txt for https://jaybharti.me
# Conforms to RFC 9309 (Robots Exclusion Protocol)

User-agent: *
Allow: /

# OpenAI Crawlers
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

# Anthropic Crawler
User-agent: ClaudeBot
Allow: /

# Perplexity AI Crawler
User-agent: PerplexityBot
Allow: /

# Google Generative AI Crawler
User-agent: Google-Extended
Allow: /

# Apple Intelligence Crawler
User-agent: Applebot-Extended
Allow: /

# Microsoft Bing & Copilot Crawler
User-agent: Bingbot
Allow: /

# Sitemap discovery
Sitemap: https://jaybharti.me/sitemap.xml
`;

export const SPEC_SITEMAP_URLS = [
  { loc: "https://jaybharti.me/", priority: "1.0", changefreq: "monthly" },
  { loc: "https://jaybharti.me/mac-orchestrator", priority: "0.9", changefreq: "monthly" },
  { loc: "https://jaybharti.me/meridian", priority: "0.9", changefreq: "monthly" },
  { loc: "https://jaybharti.me/littlebird", priority: "0.8", changefreq: "monthly" },
  { loc: "https://jaybharti.me/index.md", priority: "0.8", changefreq: "monthly" },
  { loc: "https://jaybharti.me/llms.txt", priority: "0.8", changefreq: "monthly" }
];

export const SPEC_SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://jaybharti.me/</loc>
    <lastmod>2026-09-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://jaybharti.me/mac-orchestrator</loc>
    <lastmod>2026-09-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://jaybharti.me/meridian</loc>
    <lastmod>2026-09-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://jaybharti.me/littlebird</loc>
    <lastmod>2026-09-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://jaybharti.me/index.md</loc>
    <lastmod>2026-09-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://jaybharti.me/llms.txt</loc>
    <lastmod>2026-09-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

export const SPEC_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://jaybharti.me/#website",
      "name": "Jay Bharti",
      "alternateName": ["Jay Bharti Portfolio", "JB Portfolio"],
      "url": "https://jaybharti.me/",
      "description": "Professional portfolio of Jay Bharti covering Healthcare Administration, process improvement, and agentic AI systems.",
      "author": {
        "@id": "https://jaybharti.me/#person"
      }
    },
    {
      "@type": "ProfilePage",
      "@id": "https://jaybharti.me/#profilepage",
      "url": "https://jaybharti.me/",
      "name": "Jay Bharti — Personal Portfolio",
      "isPartOf": {
        "@id": "https://jaybharti.me/#website"
      },
      "mainEntity": {
        "@id": "https://jaybharti.me/#person"
      },
      "dateCreated": "2024-08-01T00:00:00Z",
      "dateModified": "2026-09-03T00:00:00Z",
      "description": "Professional portfolio, generative engine profile, and research of Jay Bharti in Healthcare Administration, Operations, and AI systems."
    },
    {
      "@type": "Person",
      "@id": "https://jaybharti.me/#person",
      "name": "Jay Bharti",
      "url": "https://jaybharti.me",
      "image": "https://jaybharti.me/photos/main-photo-800w.jpg",
      "jobTitle": "Healthcare Administration Specialist & AI Developer",
      "email": "mailto:jaybharti3000@gmail.com",
      "description": "Healthcare Administration graduate and AI developer specializing in hospital operations, Lean Six Sigma (DMAIC), and agentic system architecture. National Winner of the 2025 QualTech Prize for eliminating 95% of plasma bag breakage in sub-zero storage.",
      "alumniOf": [
        {
          "@type": "CollegeOrUniversity",
          "name": "Prasanna School of Public Health, Manipal Academy of Higher Education",
          "url": "https://manipal.edu/psph.html"
        },
        {
          "@type": "CollegeOrUniversity",
          "name": "Manipal University Jaipur",
          "url": "https://jaipur.manipal.edu"
        }
      ],
      "knowsAbout": [
        "Healthcare Administration",
        "Hospital Operations",
        "Lean Six Sigma",
        "DMAIC Methodology",
        "Data Analytics",
        "Biostatistics",
        "Model Context Protocol (MCP)",
        "RAG-based AI Systems",
        "Python",
        "R",
        "Power BI"
      ],
      "award": [
        "National Winner — QualTech Prize Education (Qimpro Foundation, 2025)",
        "Best Student Award (Manipal University Jaipur, 2023)"
      ],
      "hasCredential": [
        {
          "@type": "EducationalOccupationalCredential",
          "name": "Lean Six Sigma Yellow Belt",
          "recognizedBy": {
            "@type": "Organization",
            "name": "Annexas Europe"
          }
        },
        {
          "@type": "EducationalOccupationalCredential",
          "name": "Supply Chain Management",
          "recognizedBy": {
            "@type": "CollegeOrUniversity",
            "name": "Rutgers University"
          }
        }
      ],
      "hasOccupation": {
        "@type": "Occupation",
        "name": "Healthcare Operations & AI Systems Specialist",
        "occupationalCategory": "11-9111.00",
        "skills": "Lean Six Sigma, DMAIC, Hospital Operations, RAG AI, WebMCP, Biostatistics",
        "experienceRequirements": {
          "@type": "OccupationalExperienceRequirements",
          "monthsOfExperience": 24,
          "description": "Demonstrated technical and operational leadership in hospital quality improvement, sub-zero blood bank packaging design, and full-stack RAG/MCP development."
        }
      },
      "sameAs": [
        "https://www.linkedin.com/in/jay-bharti",
        "https://x.com/jay2217b",
        "https://github.com/Jay-2212"
      ]
    },
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": "https://capexiq.jaybharti.me/#app",
      "name": "CapexIQ",
      "operatingSystem": "Web Browser",
      "applicationCategory": "BusinessApplication",
      "description": "A browser-first capital expenditure decision-support tool for Indian hospitals evaluating ROI, payback period, NPV, IRR, and break-even utilization for high-value medical equipment, featuring WebMCP conversational assistance.",
      "url": "https://capexiq.jaybharti.me",
      "codeRepository": "https://github.com/Jay-2212/Personal-Portfolio/tree/main/capexiq",
      "author": {
        "@id": "https://jaybharti.me/#person"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://jaybharti.me/mac-orchestrator/#app",
      "name": "Mac Orchestrator",
      "operatingSystem": "macOS",
      "applicationCategory": "DeveloperApplication",
      "description": "A streamlined Model Context Protocol (MCP) server providing AI agents with 20 lean tools for direct macOS system control via mouse, keyboard, terminal, and OCR.",
      "url": "https://jaybharti.me/mac-orchestrator",
      "codeRepository": "https://github.com/Jay-2212/mac-orchestrator",
      "author": {
        "@id": "https://jaybharti.me/#person"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://jaybharti.me/meridian/#app",
      "name": "Meridian",
      "operatingSystem": "Cloudflare Workers",
      "applicationCategory": "DeveloperApplication",
      "description": "A self-hosted RAG backend built on Cloudflare Workers, D1, and Vectorize that indexes local files and executes agentic search queries over Telegram.",
      "url": "https://jaybharti.me/meridian",
      "codeRepository": "https://github.com/Jay-2212/meridian",
      "author": {
        "@id": "https://jaybharti.me/#person"
      }
    },
    {
      "@type": ["SoftwareApplication", "MobileApplication"],
      "@id": "https://jaybharti.me/#sensum",
      "name": "Sensum",
      "operatingSystem": "Android",
      "applicationCategory": "UtilitiesApplication",
      "description": "A native Android voice keyboard utilizing Groq's Whisper API for near-instant transcription and system-wide text injection.",
      "codeRepository": "https://github.com/Jay-2212/IME",
      "author": {
        "@id": "https://jaybharti.me/#person"
      }
    },
    {
      "@type": "CreativeWork",
      "@id": "https://jaybharti.me/#qualtech-project",
      "name": "Anti-Frost Blood Bank Cassette Box & DMAIC Process Improvement",
      "award": "National Winner — QualTech® Prize Education (Qimpro Foundation, 2025)",
      "description": "Engineered anti-frost reusable packaging and lean workflow protocol that reduced plasma bag breakage by 95% and saved ₹2.6L annually at sub-zero storage (-50°C).",
      "author": {
        "@id": "https://jaybharti.me/#person"
      }
    }
  ]
};

export const SPEC_HEADERS = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin

/
  Link: <https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", <https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", <https://jaybharti.me/>; rel="service-doc"; type="text/html", <https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown"
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: Content-Type, Authorization, signature, signature-agent, signature-input
  Content-Language: en
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cache-Control: public, max-age=0, must-revalidate

/index.html
  Link: <https://jaybharti.me/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", <https://jaybharti.me/.well-known/portfolio-api.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", <https://jaybharti.me/>; rel="service-doc"; type="text/html", <https://jaybharti.me/index.md>; rel="describedby"; type="text/markdown"
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: Content-Type, Authorization, signature, signature-agent, signature-input
  Content-Language: en
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cache-Control: public, max-age=0, must-revalidate

/index.md
  Content-Type: text/markdown; charset=utf-8
  Vary: Accept
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/llms.txt
  Content-Type: text/plain; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/robots.txt
  Content-Type: text/plain; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/.well-known/api-catalog
  Content-Type: application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: Content-Type, Authorization, signature, signature-agent, signature-input
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/.well-known/portfolio-api.json
  Content-Type: application/vnd.oai.openapi+json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/.well-known/agent-skills/index.json
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: Content-Type, Authorization, signature, signature-agent, signature-input
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/.well-known/mcp/server-card.json
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: Content-Type, Authorization, signature, signature-agent, signature-input
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/photos/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/assets/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/resume/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
  Access-Control-Allow-Origin: *

/index.css
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
  Access-Control-Allow-Origin: *

/index.js
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
  Access-Control-Allow-Origin: *
`;

export const SPEC_LLMS_TXT = `# Jay Bharti Portfolio

> Canonical guide for AI systems, generative search engines, and automated agents crawling and citing https://jaybharti.me/.

Jay Bharti is a Healthcare Administration specialist (MHA, MAHE, 8.88 CGPA), developer, and researcher. National Winner of the 2025 QualTech® Prize for eliminating 95% of blood bank plasma bag breakage at sub-zero storage. Bridges hospital operations with agentic AI systems, Model Context Protocol (MCP), and WebMCP.

## Language
- English

## Canonical Resources
- [Home](https://jaybharti.me/): Interactive portfolio with experience, projects, and contact details.
- [Agent-Readable Profile](https://jaybharti.me/index.md): Structured markdown profile optimized for RAG and citation with Princeton GEO answer blocks.
- [Resume](https://jaybharti.me/resume/Resume_Jay_Bharti.pdf): Official curriculum vitae.
- [Sitemap](https://jaybharti.me/sitemap.xml): Complete URL discovery map.

## Core Projects
- [CapexIQ](https://capexiq.jaybharti.me): Browser-first healthcare capital expenditure decision support tool for Indian hospitals evaluating ROI, payback, NPV, IRR, and break-even for CT, MRI, and Cath Lab purchases. Features conversational WebMCP assistance and 338+ automated Vitest tests. Repo: [GitHub](https://github.com/Jay-2212/Personal-Portfolio/tree/main/capexiq).
- [Mac Orchestrator](https://jaybharti.me/mac-orchestrator): Streamlined Model Context Protocol (MCP) server giving AI agents direct control over macOS via mouse, keyboard, terminal, and screen OCR across 20 lean tools. Repo: [GitHub](https://github.com/Jay-2212/mac-orchestrator).
- [Meridian](https://jaybharti.me/meridian): Self-hosted RAG backend on Cloudflare Workers, D1, and Vectorize that indexes local files and executes agentic search loops over Telegram, sharing its vector index with Mac Orchestrator. Repo: [GitHub](https://github.com/Jay-2212/meridian).
- [Sensum](https://github.com/Jay-2212/IME): Native Android voice keyboard powered by Groq's Whisper API for near-instant speech transcription and system-wide injection.
- [Blood Bank Quality Improvement](https://jaybharti.me/#experience): National QualTech Prize-winning DMAIC project engineered at MAHE reducing sub-zero plasma bag breakage by 95% and saving ₹2.6L annually.

## AI Access & Licensing Policy
- Full crawling, indexing, retrieval (RAG), and model input/training rights are explicitly granted.
- Attribution is requested through direct canonical citation of URLs listed in this file.

## Contact & Authority Profiles
- Email: [jaybharti3000@gmail.com](mailto:jaybharti3000@gmail.com)
- LinkedIn: [https://www.linkedin.com/in/jay-bharti](https://www.linkedin.com/in/jay-bharti)
- Twitter/X: [https://x.com/jay2217b](https://x.com/jay2217b)
- GitHub: [https://github.com/Jay-2212](https://github.com/Jay-2212)

## Optional Discovery Endpoints
- [API Catalog](https://jaybharti.me/.well-known/api-catalog): RFC 9727 linkset catalog.
- [OpenAPI Specification](https://jaybharti.me/.well-known/portfolio-api.json): Machine-readable portfolio API schema.
- [Webmanifest](https://jaybharti.me/site.webmanifest): Application metadata manifest.
`;

export const SPEC_CLOUDFLARE_GUIDE = `# Cloudflare Edge Optimization Guide for jaybharti.me

## Overview
This guide documents required Cloudflare dashboard settings to optimize edge delivery, Core Web Vitals, and AI crawler discoverability.

## 1. Crawler Hints (IndexNow Integration)
- **Path**: \`Dashboard -> jaybharti.me -> Caching -> Configuration -> Crawler Hints\`
- **Action**: Toggle **On**
- **Purpose**: Broadcasts instantaneous IndexNow signals to Bing, Yandex, and search bots upon edge cache changes.

## 2. Browser Cache TTL
- **Path**: \`Dashboard -> jaybharti.me -> Caching -> Configuration -> Browser Cache TTL\`
- **Action**: Set to **"Respect Existing Headers"**
- **Purpose**: Prevents Cloudflare from overriding customized \`Cache-Control\` rules in \`_headers\`.

## 3. Early Hints (103 Early Hints)
- **Path**: \`Dashboard -> jaybharti.me -> Speed -> Optimization -> Content Optimization -> Early Hints\`
- **Action**: Toggle **On**
- **Purpose**: Emits 103 Early Hints for preconnect and stylesheet links, reducing FCP and LCP.

## 4. Tiered Cache (Smart Tiered Caching)
- **Path**: \`Dashboard -> jaybharti.me -> Caching -> Tiered Cache\`
- **Action**: Toggle **On** (Smart Tiered Caching)
- **Purpose**: Routes cache requests through regional hubs to maximize edge hit ratio (>95%).

## 5. Protocol Optimization (HTTP/3 QUIC & 0-RTT)
- **Path**: \`Dashboard -> Speed -> Optimization -> Protocol Optimization -> HTTP/3\`
- **Action**: Toggle **On**
- **Purpose**: Accelerates connection setup over mobile networks.

## 6. AI Crawlers & WAF Rules
- **Path**: \`Dashboard -> jaybharti.me -> Security -> Bots\`
- **Action**: Ensure verified AI search bots (\`GPTBot\`, \`ClaudeBot\`, \`PerplexityBot\`, \`OAI-SearchBot\`, \`Google-Extended\`, \`Applebot-Extended\`, \`Bingbot\`) are explicitly ALLOWED.
`;

export const SPEC_INDEXNOW_SCRIPT = `#!/usr/bin/env bash
# IndexNow push notification script for jaybharti.me
set -euo pipefail

HOST="jaybharti.me"
KEY="\${INDEXNOW_KEY:-c4b12d593e8749a0a4e76a6cf3832d21}"
KEY_LOCATION="https://\${HOST}/\${KEY}.txt"
ENDPOINT="https://api.indexnow.org/indexnow"

DRY_RUN=0
if [[ "\${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

URLS=(
  "https://\${HOST}/"
  "https://\${HOST}/mac-orchestrator"
  "https://\${HOST}/meridian"
  "https://\${HOST}/littlebird"
  "https://\${HOST}/index.md"
  "https://\${HOST}/llms.txt"
)

# Build JSON payload
URL_LIST_JSON=$(printf '"%s",' "\${URLS[@]}" | sed 's/,$//')
PAYLOAD=$(cat <<EOF
{
  "host": "\${HOST}",
  "key": "\${KEY}",
  "keyLocation": "\${KEY_LOCATION}",
  "urlList": [\${URL_LIST_JSON}]
}
EOF
)

if [[ "\$DRY_RUN" -eq 1 ]]; then
  echo "IndexNow Dry Run: would submit payload to \$ENDPOINT"
  echo "\$PAYLOAD"
  exit 0
fi

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "\$ENDPOINT" \\
  -H "Content-Type: application/json; charset=utf-8" \\
  -d "\$PAYLOAD")

if [[ "\$RESPONSE" == "200" || "\$RESPONSE" == "202" ]]; then
  echo "IndexNow notification succeeded (HTTP \$RESPONSE)"
  exit 0
else
  echo "IndexNow notification failed with HTTP \$RESPONSE" >&2
  exit 1
fi
`;
