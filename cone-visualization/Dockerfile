# syntax=docker/dockerfile:1.7

# ----- Stage 1: fetch + build cone_editor (the library) ------------------
# cone-visualization depends on the section-circumference branch (adds the
# optional per-section circumference field). Pin the clone until it merges.
FROM node:22-alpine AS cone_editor
WORKDIR /cone_editor
RUN apk add --no-cache git
RUN git clone --depth=1 --branch feat/section-circumference https://github.com/off-by-one-pixel/toy-editor.git . \
 && npm ci \
 && npm run build

# ----- Stage 2: install + build the Next.js app -------------------------
FROM node:22-alpine AS builder
# Place the built cone_editor at the sibling path the app's package.json
# expects: `file:../cone_editor`, and /app/../cone_editor = /cone_editor.
COPY --from=cone_editor /cone_editor /cone_editor
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ----- Stage 3: runtime (serves the static export) ----------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl \
 && npm install -g serve@14.2.4
# next.config.ts sets distDir: 'build', so the static export lands in /app/build.
COPY --from=builder /app/build ./build
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve build -l tcp://0.0.0.0:${PORT}"]
