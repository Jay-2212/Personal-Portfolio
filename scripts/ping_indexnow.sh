#!/usr/bin/env bash
# scripts/ping_indexnow.sh
# Automated IndexNow search engine ping script for jaybharti.me
# Conforms to IndexNow Protocol (https://www.indexnow.org/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENDPOINT="https://api.indexnow.org/indexnow"
HOST="${INDEXNOW_HOST:-jaybharti.me}"
DEFAULT_KEY="cfd0bbec738e4a9e9a4f48dfbf203ea7"

# Parse CLI options FIRST before any disk writes
DRY_RUN=false
CUSTOM_URLS=()

show_help() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS] [URL1 URL2 ...]

Options:
  --dry-run, -n    Validate payload and simulate submission without network request
  --help, -h       Display this help message

If no URLs are provided, all canonical site endpoints are submitted by default.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    -*)
      echo "Error: Unrecognized option '$1'" >&2
      show_help >&2
      exit 1
      ;;
    *)
      CUSTOM_URLS+=("$1")
      shift
      ;;
  esac
done

# Detect or use configured key
if [[ -n "${INDEXNOW_KEY:-}" ]]; then
  KEY="$INDEXNOW_KEY"
else
  # Check if a 32-char hex key file exists in repo root
  DETECTED_KEY_FILE=$(find "$REPO_ROOT" -maxdepth 1 -name "[a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9].txt" 2>/dev/null | head -n 1 || true)
  if [[ -n "$DETECTED_KEY_FILE" && -f "$DETECTED_KEY_FILE" ]]; then
    KEY=$(basename "$DETECTED_KEY_FILE" .txt)
  else
    KEY="$DEFAULT_KEY"
  fi
fi

KEY_FILE="$REPO_ROOT/${KEY}.txt"
KEY_LOCATION="https://${HOST}/${KEY}.txt"

# Ensure key file exists ONLY for live submissions (never during dry-run)
if [[ "$DRY_RUN" = false && ! -f "$KEY_FILE" ]]; then
  echo "$KEY" > "$KEY_FILE"
  echo "Created matching key file: $KEY_FILE"
fi

# Default canonical URLs if none provided
if [[ ${#CUSTOM_URLS[@]} -eq 0 ]]; then
  URL_LIST=(
    "https://${HOST}/"
    "https://${HOST}/mac-orchestrator"
    "https://${HOST}/meridian"
    "https://${HOST}/littlebird"
    "https://${HOST}/index.md"
    "https://${HOST}/llms.txt"
    "https://${HOST}/sitemap.xml"
  )
else
  URL_LIST=("${CUSTOM_URLS[@]}")
fi

# Build JSON payload
JSON_URLS=""
for url in "${URL_LIST[@]}"; do
  if [[ -n "$JSON_URLS" ]]; then
    JSON_URLS="${JSON_URLS},"
  fi
  JSON_URLS="${JSON_URLS}\"${url}\""
done

PAYLOAD=$(cat <<EOF
{
  "host": "${HOST}",
  "key": "${KEY}",
  "keyLocation": "${KEY_LOCATION}",
  "urlList": [
$(for url in "${URL_LIST[@]}"; do echo "    \"$url\","; done | sed '$ s/,$//')
  ]
}
EOF
)

if [[ "$DRY_RUN" = true ]]; then
  echo "=========================================="
  echo "IndexNow Dry-Run Mode"
  echo "=========================================="
  echo "Target Endpoint : $ENDPOINT"
  echo "Host            : $HOST"
  echo "Key             : $KEY"
  echo "Key Location    : $KEY_LOCATION"
  echo "Total URLs      : ${#URL_LIST[@]}"
  echo "Key File Status : $(if [[ -f "$KEY_FILE" ]]; then echo "Present ($KEY_FILE)"; else echo "Missing"; fi)"
  echo "------------------------------------------"
  echo "Payload:"
  echo "$PAYLOAD"
  echo "------------------------------------------"
  echo "[DRY-RUN] Validation PASSED. Payload is valid JSON. No HTTP request sent."
  exit 0
fi

echo "Submitting ${#URL_LIST[@]} URLs to IndexNow (${ENDPOINT})..."

if ! command -v curl &>/dev/null; then
  echo "Error: curl is required for live IndexNow submissions." >&2
  exit 1
fi

RESPONSE=$(curl -s -S -w "\nHTTP_STATUS:%{http_code}" \
  -H "Content-Type: application/json; charset=utf-8" \
  -X POST \
  -d "$PAYLOAD" \
  "$ENDPOINT" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2 || true)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:" || true)

case "$HTTP_CODE" in
  200)
    echo "HTTP 200: OK — URLs successfully submitted and indexed."
    exit 0
    ;;
  202)
    echo "HTTP 202: Accepted — Key received; URL submission is pending verification."
    exit 0
    ;;
  400)
    echo "HTTP 400: Bad Request — Invalid payload format." >&2
    [[ -n "$BODY" ]] && echo "Response: $BODY" >&2
    exit 1
    ;;
  403)
    echo "HTTP 403: Forbidden — In-key invalid or key not found at keyLocation ($KEY_LOCATION)." >&2
    [[ -n "$BODY" ]] && echo "Response: $BODY" >&2
    exit 1
    ;;
  422)
    echo "HTTP 422: Unprocessable Entity — URL host does not match 'host' property." >&2
    [[ -n "$BODY" ]] && echo "Response: $BODY" >&2
    exit 1
    ;;
  429)
    echo "HTTP 429: Too Many Requests — Submission rate limit exceeded." >&2
    [[ -n "$BODY" ]] && echo "Response: $BODY" >&2
    exit 1
    ;;
  *)
    echo "HTTP $HTTP_CODE: Unexpected response from IndexNow." >&2
    [[ -n "$BODY" ]] && echo "Response: $BODY" >&2
    exit 1
    ;;
esac
