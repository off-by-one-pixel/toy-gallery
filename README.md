# Toy Gallery

An inventory tracking app for adult sex toys. Each item stores metadata like brand, model, and dimensions, along with a visual representation of its shape that can be edited in-app.

## What it does

- **Inventory** — catalog individual toys with properties such as brand, model, and overall dimensions.
- **Visual editor** — build and edit a visual representation of each toy by stacking cylindrical sections (diameter + height) with a configurable top (egg or cone), so the rendered silhouette matches the physical object.
- **Gallery view** — browse the collection with each toy rendered from its shape data.

## Self-hosting with Docker

A ready-to-run image is available at `ghcr.io/off-by-one-pixel/toy-gallery:latest`.

All your data is kept in a folder you mount as `/data` — pick any folder on your machine. The examples below do this for you.

### Quick start with `docker run`

```bash
docker run -d \
  --name toy-gallery \
  -p 8000:8000 \
  -v ./data:/data \
  -e INITIAL_USERNAME=admin \
  -e INITIAL_PASSWORD=change-me \
  ghcr.io/off-by-one-pixel/toy-gallery:latest
```

Open <http://localhost:8000> and sign in.

### `docker-compose.yml`

```yaml
services:
  toy-gallery:
    image: ghcr.io/off-by-one-pixel/toy-gallery:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data:/data
    environment:
      INITIAL_USERNAME: admin
      INITIAL_PASSWORD: change-me
      # Set once you front the container with HTTPS:
      # TRUSTED_ORIGINS: https://your.domain
    restart: unless-stopped
```

The container uses an embedded SQLite database; everything it needs to persist lives inside the volume you mount. No separate database container is needed.

### Safe upgrades

When you pull a newer image tag, the container runs database migrations automatically on startup behind a safety gate: migrations are applied to a working copy of your database first, and only swapped into place if everything passes. If a migration fails, your live database is untouched — pulling the previous image tag will start normally because nothing changed. See [docs/migration-safety.md](docs/migration-safety.md) for the full contract.

### Environment variables

All optional — set only what you need.

| Variable           | Default                              | What it does                                                                              |
|--------------------|--------------------------------------|-------------------------------------------------------------------------------------------|
| `DATA_DIR`         | `/data`                              | Where the SQLite database, secret key, and migration archives live inside the container. Change this if you mount your volume somewhere other than `/data`. |
| `INITIAL_USERNAME` | unset                                | Together with `INITIAL_PASSWORD`, creates an admin account the first time the app starts. |
| `INITIAL_PASSWORD` | unset                                | Password for the admin above. Change it after first login.                                |
| `INITIAL_EMAIL`    | empty                                | Optional email for the admin account.                                                     |
| `TRUSTED_ORIGINS`  | empty                                | Public URLs you'll reach the app from once it's behind HTTPS (comma-separated).           |
| `SECRET_KEY`       | generated automatically and stored in `DATA_DIR` | Set this if you'd rather manage the key yourself.                              |
| `PORT`             | `8000`                               | Port the app listens on inside the container.                                             |
| `WORKERS`          | `3`                                  | How many web workers to run. Bump it on bigger machines.                                  |
| `SSL_CERT_PATH`    | `$DATA_DIR/certs/cert.pem`           | Path inside the container to a TLS certificate. If both this and the key are present, the app serves HTTPS. |
| `SSL_KEY_PATH`     | `$DATA_DIR/certs/key.pem`            | Path inside the container to the private key matching the certificate above.              |

### Serving over HTTPS

Drop a certificate and key into a `certs` folder inside your data folder, then start the container as usual:

```
./data/
  └── certs/
      ├── cert.pem
      └── key.pem
```

When both files are present the app serves HTTPS instead of HTTP — no extra flags needed. If you keep your certs somewhere else, point `SSL_CERT_PATH` and `SSL_KEY_PATH` at them.

Renewing the certificate is up to you (e.g. with `certbot` or `acme.sh`); just replace the files and restart the container. Don't forget to add your public URL to `TRUSTED_ORIGINS` so the admin pages accept form submissions over HTTPS.

### Putting it on the internet

If you'd rather not manage the certificate yourself, you can put a reverse proxy with automatic HTTPS in front of the container instead — Caddy, Traefik, and Cloudflare Tunnel all handle that for you.

## Projects in this repo

This repo is a multi-project monorepo. Each directory is an independent project with its own `package.json` / `pyproject.toml`:

### [`toy_gallery_be/`](toy_gallery_be/) — Django backend
REST API (Django 5 + DRF) with JWT auth. Stores toys and their shape data (ordered cylindrical sections + top-shape enum). Serves the gallery and editor frontends.

### [`cone-visualization/`](cone-visualization/) — gallery frontend (primary app)
Next.js 16 + HeroUI v3 + Tailwind 4. The main Toy Gallery UI — browse, search, sort, group, edit attributes inline, and pin fields. Talks to the Django backend.

### [`cone_editor/`](cone_editor/) — shape editor component library (submodule)
Headless React component (`<ToyEditor />`) for building/editing a toy's silhouette by stacking cylindrical sections with a configurable egg / cone top. Lives in its own repo at [off-by-one-pixel/toy-editor](https://github.com/off-by-one-pixel/toy-editor) and is consumed here as a git submodule. Ships its own `styles.css` so consumers aren't forced into a specific UI framework. Built with tsup + TypeScript + Zustand; tested with Vitest.

## Local development

A root [`Makefile`](Makefile) wraps the two most common workflows:

```bash
make be   # Django backend on 0.0.0.0:8000
make fe   # Next.js dev server for cone-visualization
```

`make test` runs both suites; `make test-be` and `make test-fe` run them individually.

For anything in `cone_editor/`, run `npm install && npm run dev` (or `build`, `test`, `lint`) inside that directory.

See [CLAUDE.md](CLAUDE.md) for a deeper map of the repo (layout, commands, architecture).
