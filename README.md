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

### `docker-compose.yml` — SQLite

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

### `docker-compose.yml` — Postgres

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: toys
      POSTGRES_USER: toys
      POSTGRES_PASSWORD: toys-pw
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  toy-gallery:
    image: ghcr.io/off-by-one-pixel/toy-gallery:latest
    depends_on: [db]
    ports:
      - "8000:8000"
    volumes:
      - ./data:/data
    environment:
      DB_URL: postgres://toys:toys-pw@db:5432/toys
      INITIAL_USERNAME: admin
      INITIAL_PASSWORD: change-me
    restart: unless-stopped

volumes:
  pgdata:
```

### Supported databases

| Database   | Example `DB_URL`                              |
|------------|-----------------------------------------------|
| SQLite     | `sqlite:////data/db.sqlite3` (the default)    |
| PostgreSQL | `postgres://user:pw@host:5432/dbname`         |

### Environment variables

All optional — set only what you need.

| Variable           | Default                              | What it does                                                                              |
|--------------------|--------------------------------------|-------------------------------------------------------------------------------------------|
| `DB_URL`           | a built-in database in `/data`       | Point at your own database (see _Supported databases_ above for example URLs).            |
| `INITIAL_USERNAME` | unset                                | Together with `INITIAL_PASSWORD`, creates an admin account the first time the app starts. |
| `INITIAL_PASSWORD` | unset                                | Password for the admin above. Change it after first login.                                |
| `INITIAL_EMAIL`    | empty                                | Optional email for the admin account.                                                     |
| `TRUSTED_ORIGINS`  | empty                                | Public URLs you'll reach the app from once it's behind HTTPS (comma-separated).           |
| `SECRET_KEY`       | generated automatically and stored in `/data` | Set this if you'd rather manage the key yourself.                                  |
| `PORT`             | `8000`                               | Port the app listens on inside the container.                                             |
| `WORKERS`          | `3`                                  | How many web workers to run. Bump it on bigger machines.                                  |

### Putting it on the internet

If you want the app reachable beyond your own machine, put HTTPS in front of it (using nginx, Caddy, Traefik, Cloudflare, or whatever you already use), and add your public URL to `TRUSTED_ORIGINS` so the admin pages keep working.

## Projects in this repo

This repo is a multi-project monorepo. Each directory is an independent project with its own `package.json` / `pyproject.toml`:

### [`toy_gallery_be/`](toy_gallery_be/) — Django backend
REST API (Django 5 + DRF) with JWT auth. Stores toys and their shape data (ordered cylindrical sections + top-shape enum). Serves the gallery and editor frontends.

### [`cone-visualization/`](cone-visualization/) — gallery frontend (primary app)
Next.js 16 + HeroUI v3 + Tailwind 4. The main Toy Gallery UI — browse, search, sort, group, edit attributes inline, and pin fields. Talks to the Django backend.

### [`cone_editor/`](cone_editor/) — shape editor component library
Headless React component (`<ToyEditor />`) for building/editing a toy's silhouette by stacking cylindrical sections with a configurable egg / cone top. Published as `cone-editor` and consumed by the gallery and demo apps via GitHub (`github:off-by-one-pixel/toy-editor`). Ships its own `styles.css` so consumers aren't forced into a specific UI framework. Built with tsup + TypeScript + Zustand; tested with Vitest.

### [`toy-svg-editor/`](toy-svg-editor/) — standalone demo for `cone_editor`
Minimal Next.js 16 app that showcases `cone-editor` in isolation: tweak a toy's dimensions and colors, then copy the generated SVG. Useful for developing the editor component in isolation from the full gallery app.

## Local development

A root [`Makefile`](Makefile) wraps the two most common workflows:

```bash
make be   # Django backend on 0.0.0.0:8000
make fe   # Next.js dev server for cone-visualization
```

`make test` runs both suites; `make test-be` and `make test-fe` run them individually.

For anything in `cone_editor/` or `toy-svg-editor/`, run `npm install && npm run dev` (or `build`, `test`, `lint`) inside that directory.

See [CLAUDE.md](CLAUDE.md) for a deeper map of the repo (layout, commands, architecture).
