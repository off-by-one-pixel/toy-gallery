.PHONY: help be be-prod fe migrate test test-be test-fe schema

help:
	@echo "Targets:"
	@echo "  make be        Run Django backend on 0.0.0.0:8000 (Ctrl+C to stop)"
	@echo "  make be-prod   Run Django the way it runs in Docker (gunicorn + WhiteNoise serving the bundled SPA)"
	@echo "  make fe        Run Next.js frontend dev server (Ctrl+C to stop)"
	@echo "  make migrate   Apply pending Django migrations to the dev database"
	@echo "  make test      Run backend and frontend tests"
	@echo "  make test-be   Run backend tests (Django)"
	@echo "  make test-fe   Run frontend tests (Vitest)"
	@echo "  make schema    Regenerate the OpenAPI schema (api/schema.yml)"
	@echo "For dev, run 'make be' and 'make fe' in separate terminals."

be:
	cd api && uv run python manage.py runserver 0.0.0.0:8000

# Mirrors the Docker entrypoint: builds the Next.js export, runs the same
# migrate + collectstatic + gunicorn sequence under settings_docker_local
# (a thin override of settings_docker pointing WhiteNoise at the live
# build and using the dev sqlite DB).
PROD_SETTINGS = DJANGO_SETTINGS_MODULE=toy_gallery.settings_docker_local

be-prod:
	cd cone-visualization && npm run build
	cd api && $(PROD_SETTINGS) uv run python manage.py migrate --noinput
	cd api && $(PROD_SETTINGS) uv run python manage.py collectstatic --noinput
	cd api && $(PROD_SETTINGS) uv run gunicorn toy_gallery.wsgi:application --bind 0.0.0.0:8000

migrate:
	cd api && uv run python manage.py migrate

fe:
	cd cone-visualization && npm run dev

test: test-be test-fe

test-be:
	cd api && uv run python manage.py test toys

test-fe:
	cd cone-visualization && npm test

schema:
	cd api && uv run python manage.py spectacular --file schema.yml --validate
