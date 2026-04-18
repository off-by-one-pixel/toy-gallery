.PHONY: help be fe test test-be test-fe

help:
	@echo "Targets:"
	@echo "  make be        Run Django backend on 0.0.0.0:8000 (Ctrl+C to stop)"
	@echo "  make fe        Run Next.js frontend dev server (Ctrl+C to stop)"
	@echo "  make test      Run backend and frontend tests"
	@echo "  make test-be   Run backend tests (Django)"
	@echo "  make test-fe   Run frontend tests (Vitest)"
	@echo "For dev, run 'make be' and 'make fe' in separate terminals."

be:
	cd toy_gallery_be && uv run python manage.py runserver 0.0.0.0:8000

fe:
	cd cone-visualization && npm run dev

test: test-be test-fe

test-be:
	cd toy_gallery_be && uv run python manage.py test toys

test-fe:
	cd cone-visualization && npm test
