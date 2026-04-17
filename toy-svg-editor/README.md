# toy-svg-editor

Standalone Next.js demo app for the [`cone-editor`](../cone_editor) React component library. Use it to interactively tweak a toy's shape, stroke, and fill color, then copy the generated SVG to the clipboard.

It exists so the component can be built, demoed, and shared without any extra dependencies from the larger Toy Gallery app.

## Stack

- Next.js 16 (App Router, Turbopack, static export)
- React 19.2
- Tailwind CSS 4
- `cone-editor` — linked as `file:../cone_editor` so local changes to the library are picked up without republishing
- `react-colorful` — hex color pickers

## Develop

```bash
make install      # or: npm install
make dev          # http://localhost:3000
make lint
make typecheck
make build        # static export to ./out
```

(`make help` prints all targets.)

## Layout

- `app/page.tsx` — the demo UI (color pickers, width/stroke sliders, copy button, the `<ToyEditor />`).
- `app/globals.css` — imports Tailwind and `cone-editor/styles.css`.
- `next.config.ts` — static export + Turbopack `root: ..` so the sibling `cone_editor/` is inside the workspace root.

## CI

`../.github/workflows/toy-svg-editor.yml` (at the monorepo root) runs `lint`, `typecheck`, and `build` on PRs and pushes to `main` that touch `toy-svg-editor/` or `cone_editor/`.

## Deploy

Configured for Nixpacks via [`nixpacks.toml`](nixpacks.toml) with this folder as the deploy root.

The `file:../cone_editor` dep can't be satisfied from the monorepo submodule (Docker can't `COPY` outside its build context), so the install phase **clones `cone_editor` fresh from `github.com/off-by-one-pixel/toy-editor` into `/cone_editor`** inside the container, which is exactly where `file:../cone_editor` resolves from `/app`. It then builds cone_editor before running the demo's own `npm ci`, so the nested `prepare` script has its devDeps.

The live demo therefore always tracks `main` of `cone_editor`, independent of the submodule pin in this repo.
