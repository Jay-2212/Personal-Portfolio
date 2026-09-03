# Makefile to automate common portfolio website commands

.PHONY: run push test verify indexnow indexnow-dry help

help:
	@echo "Usage:"
	@echo "  make run             - Start local HTTP server on port 8000"
	@echo "  make push msg=\"msg\"  - Stage all files, commit, and push to main"
	@echo "  make test            - Run all E2E, adversarial, and worker test suites"
	@echo "  make verify          - Run full verification (tests + dry-run IndexNow)"
	@echo "  make indexnow        - Notify IndexNow (Bing, Yandex) of updated URLs"
	@echo "  make indexnow-dry    - Dry-run IndexNow ping without network request"

run:
	@echo "Starting local server at http://localhost:8000..."
	python3 -m http.server 8000

push:
	@git add .
	@git commit -m "$(if $(msg),$(msg),Update portfolio)"
	@unset GITHUB_TOKEN && git push origin main
	@echo "Portfolio successfully pushed to GitHub!"

test:
	@echo "Running E2E and adversarial test suite..."
	@node --test tests/**/*.test.mjs
	@echo "Running Cloudflare worker unit tests..."
	@node --test cloudflare/markdown-negotiation-worker/test/*.test.mjs
	@echo "All test suites passed cleanly."

verify: test indexnow-dry
	@echo "=========================================="
	@echo "Unified Verification: 100% PASSED"
	@echo "=========================================="

indexnow:
	@bash scripts/ping_indexnow.sh

indexnow-dry:
	@bash scripts/ping_indexnow.sh --dry-run
