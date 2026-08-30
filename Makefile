.PHONY: help be be-prod fe migrate test test-be test-fe schema sonar

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
	@echo "  make sonar     Sonar-scan the worktree into the toy-gallery-local scratch project (needs SONAR_HOST_URL and SONAR_TOKEN)"
	@echo "For dev, run 'make be' and 'make fe' in separate terminals."

be:
	cd api && uv run python manage.py runserver 0.0.0.0:8000

# Mirrors the Docker entrypoint: builds the Next.js export, runs the same
# migrate + collectstatic + gunicorn sequence under settings_docker_local
# (a thin override of settings_docker pointing WhiteNoise at the live
# build and using the dev sqlite DB).
PROD_SETTINGS = DJANGO_SETTINGS_MODULE=toy_gallery.settings_docker_local

be-prod:
	cd web && pnpm build
	cd api && $(PROD_SETTINGS) uv run python manage.py migrate --noinput
	cd api && $(PROD_SETTINGS) uv run python manage.py collectstatic --noinput
	cd api && $(PROD_SETTINGS) uv run gunicorn toy_gallery.wsgi:application --bind 0.0.0.0:8000

migrate:
	cd api && uv run python manage.py migrate

fe:
	cd web && pnpm dev

test: test-be test-fe

test-be:
	cd api && uv run python manage.py test toys

test-fe:
	cd web && pnpm test

schema:
	cd api && uv run python manage.py spectacular --file schema.yml --validate

sonar:
	@test -n "$(SONAR_HOST_URL)" || { echo "SONAR_HOST_URL is not set"; exit 1; }
	@test -n "$(SONAR_TOKEN)" || { echo "SONAR_TOKEN is not set (SonarQube: My Account > Security)"; exit 1; }
	sonar-scanner \
		-Dsonar.projectKey=toy-gallery-local \
		-Dsonar.projectName="Toy Gallery (local)" \
		-Dsonar.host.url=$(SONAR_HOST_URL) \
		-Dsonar.token=$(SONAR_TOKEN)
	@taskId=$$(sed -n 's/^ceTaskId=//p' .scannerwork/report-task.txt); \
	for i in $$(seq 1 60); do \
		status=$$(curl -sf -u $(SONAR_TOKEN): "$(SONAR_HOST_URL)/api/ce/task?id=$$taskId" | sed -n 's/.*"status":"\([A-Z_]*\)".*/\1/p'); \
		case $$status in \
			SUCCESS) echo "analysis processed"; exit 0;; \
			FAILED|CANCELED) echo "analysis processing $$status"; exit 1;; \
		esac; \
		sleep 2; \
	done; \
	echo "timed out waiting for analysis processing"; exit 1
