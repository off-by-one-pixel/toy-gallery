# syntax=docker/dockerfile:1.7

# Build context: repo root. Invoke with:
#   docker build -f web/Dockerfile .

# ----- Stage 1: build the frontend (toy-editor + Next.js app) -----------
FROM node:22-alpine AS builder
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY web/package.json web/
COPY toy-editor/package.json toy-editor/
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY toy-editor/ toy-editor/
COPY web/ web/
# The orval config reads `../api/schema.yml`. Bring just that file
# into the builder so the generated SDK is always regenerated from the
# committed schema at image-build time.
COPY api/schema.yml api/schema.yml
RUN pnpm --filter toy-editor build && pnpm --filter web build

# ----- Stage 2: runtime (serves the static export) ----------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl \
 && npm install -g serve@14.2.4
# next.config.ts sets distDir: 'build', so the static export lands in build/.
COPY --from=builder /workspace/web/build ./build
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve build -l tcp://0.0.0.0:${PORT}"]
