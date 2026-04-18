# Toy Gallery

An inventory tracking app for adult sex toys. Each item stores metadata like brand, model, and dimensions, along with a visual representation of its shape that can be edited in-app.

## What it does

- **Inventory** — catalog individual toys with properties such as brand, model, and overall dimensions.
- **Visual editor** — build and edit a visual representation of each toy by stacking cylindrical sections (diameter + height) with a configurable top (egg or cone), so the rendered silhouette matches the physical object.
- **Gallery view** — browse the collection with each toy rendered from its shape data.

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
