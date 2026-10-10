# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS frontend
ARG APP_VERSION=dev
ARG APP_COMMIT_SHA=local
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY web/package.json web/
COPY toy-editor/package.json toy-editor/
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY toy-editor/ toy-editor/
COPY web/ web/
COPY api/schema.yml api/schema.yml
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NEXT_PUBLIC_APP_COMMIT_SHA=$APP_COMMIT_SHA
RUN pnpm --filter toy-editor build && pnpm --filter web build

FROM python:3.13-slim AS python_deps
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1
RUN pip install --no-cache-dir uv==0.5.14
WORKDIR /app
COPY api/pyproject.toml api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=toy_gallery.settings_docker \
    PATH="/app/.venv/bin:$PATH" \
    PORT=8000

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=python_deps /app/.venv /app/.venv
COPY api/ /app/
COPY --from=frontend /workspace/web/build /app/frontend
RUN python -m whitenoise.compress /app/frontend
COPY docker/ /app/docker/
RUN chmod +x /app/docker/entrypoint.sh \
 && mkdir -p /data

VOLUME ["/data"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/health/" || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
