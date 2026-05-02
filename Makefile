.PHONY: help be fe migrate test test-be test-fe schema

help:
	@echo "Targets:"
	@echo "  make be        Run Django backend on 0.0.0.0:8000 (Ctrl+C to stop)"
	@echo "  make fe        Run Next.js frontend dev server (Ctrl+C to stop)"
	@echo "  make migrate   Apply pending Django migrations to the dev database"
	@echo "  make test      Run backend and frontend tests"
	@echo "  make test-be   Run backend tests (Django)"
	@echo "  make test-fe   Run frontend tests (Vitest)"
	@echo "  make schema    Regenerate the OpenAPI schema (toy_gallery_be/schema.yml)"
	@echo "For dev, run 'make be' and 'make fe' in separate terminals."

be:
	cd toy_gallery_be && uv run python manage.py runserver 0.0.0.0:8000

migrate:
	cd toy_gallery_be && uv run python manage.py migrate

fe:
	cd cone-visualization && npm run dev

test: test-be test-fe

test-be:
	cd toy_gallery_be && uv run python manage.py test toys

test-fe:
	cd cone-visualization && npm test

schema:
	cd toy_gallery_be && uv run python manage.py spectacular --file schema.yml --validate
