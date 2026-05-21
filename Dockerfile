# syntax=docker/dockerfile:1.7

# All-in-one production image. Single process: Django (gunicorn) serves the
# API + admin, WhiteNoise serves the Next.js static export at the URL root,
# and a catch-all view falls back to index.html for client-side routes.
#
# Build context: repo root.
#   docker build -t toy-gallery .

# ----- Stage 1: build toy-editor (the React component library) ----------
# Builds the submodule that's pinned in this repo (`git submodule update
# --init` must have populated toy-editor/ before `docker build`). Using
# the submodule rather than cloning a fresh tip-of-main keeps the parent
# repo and the editor in lockstep.
FROM node:22-alpine AS toy_editor
WORKDIR /toy-editor
COPY toy-editor/ ./
RUN npm ci && npm run build

# ----- Stage 2: build the Next.js static export --------------------------
FROM node:22-alpine AS frontend
ARG APP_VERSION=dev
ARG APP_COMMIT_SHA=local
COPY --from=toy_editor /toy-editor /workspace/toy-editor
WORKDIR /workspace/cone-visualization
COPY cone-visualization/package.json cone-visualization/package-lock.json ./
RUN npm ci
COPY cone-visualization/ ./
COPY api/schema.yml /workspace/api/schema.yml
# Empty string flips the frontend into same-origin mode (see src/config.ts).
# APP_VERSION + APP_COMMIT_SHA are inlined into the static bundle so the UI
# can show what the user is running.
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NEXT_PUBLIC_APP_COMMIT_SHA=$APP_COMMIT_SHA
RUN npm run build

# ----- Stage 3: install Python deps with uv ------------------------------
FROM python:3.13-slim AS python_deps
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1
RUN pip install --no-cache-dir uv==0.5.14
WORKDIR /app
COPY api/pyproject.toml api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# ----- Stage 4: runtime --------------------------------------------------
FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=toy_gallery.settings_docker \
    PATH="/app/.venv/bin:$PATH" \
    PORT=8000

# libpq for psycopg2 binary; curl for the healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=python_deps /app/.venv /app/.venv
COPY api/ /app/
COPY --from=frontend /workspace/cone-visualization/build /app/frontend
COPY docker/ /app/docker/
RUN chmod +x /app/docker/entrypoint.sh \
 && mkdir -p /data

# /data holds the SQLite DB (when DB_URL is unset) and the auto-generated
# SECRET_KEY. Mount a volume here to persist state across restarts.
VOLUME ["/data"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/health/" || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
