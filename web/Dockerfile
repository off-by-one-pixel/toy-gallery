# syntax=docker/dockerfile:1.7

# Build context: repo root. Invoke with:
#   docker build -f web/Dockerfile .

# ----- Stage 1: build toy-editor (the vendored library) -----------------
FROM node:22-alpine AS toy_editor
WORKDIR /toy-editor
COPY toy-editor/package.json toy-editor/pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --ignore-scripts
COPY toy-editor/ ./
RUN pnpm build

# ----- Stage 2: install + build the Next.js app -------------------------
FROM node:22-alpine AS builder
# The Next.js app's package.json has `toy-editor: link:../toy-editor`.
# Preserve the sibling layout under /workspace/.
COPY --from=toy_editor /toy-editor /workspace/toy-editor
WORKDIR /workspace/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY web/ ./
# The orval config reads `../api/schema.yml`. Bring just that file
# into the builder so the generated SDK is always regenerated from the
# committed schema at image-build time.
COPY api/schema.yml /workspace/api/schema.yml
RUN pnpm build

# ----- Stage 3: runtime (serves the static export) ----------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl \
 && npm install -g serve@14.2.4
# next.config.ts sets distDir: 'build', so the static export lands in build/.
COPY --from=builder /workspace/web/build ./build
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve build -l tcp://0.0.0.0:${PORT}"]
