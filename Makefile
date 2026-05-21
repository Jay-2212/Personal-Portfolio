# Makefile to automate common portfolio website commands

.PHONY: run push help

help:
	@echo "Usage:"
	@echo "  make run             - Start local HTTP server on port 8000"
	@echo "  make push msg=\"msg\"  - Stage all files, commit, and push to main"

run:
	@echo "Starting local server at http://localhost:8000..."
	python3 -m http.server 8000

push:
	@git add .
	@git commit -m "$(if $(msg),$(msg),Update portfolio)"
	@git push origin main
	@echo "Portfolio successfully pushed to GitHub!"
