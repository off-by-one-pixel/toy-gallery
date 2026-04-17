# syntax=docker/dockerfile:1.7

# ----- Stage 1: fetch + build cone_editor (the library) ------------------
FROM node:22-alpine AS cone_editor
WORKDIR /cone_editor
RUN apk add --no-cache git
RUN git clone --depth=1 https://github.com/off-by-one-pixel/toy-editor.git . \
 && npm ci \
 && npm run build

# ----- Stage 2: install + build the Next.js demo ------------------------
FROM node:22-alpine AS builder
# Place the built cone_editor at the sibling path the demo's package.json
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
RUN npm install -g serve@14.2.4
COPY --from=builder /app/out ./out
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve out -l tcp://0.0.0.0:${PORT}"]
