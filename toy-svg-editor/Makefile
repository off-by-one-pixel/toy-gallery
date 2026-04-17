.PHONY: help install clean dev build start lint lint-fix typecheck format

help:
	@echo "Targets:"
	@echo "  make install    Install npm dependencies"
	@echo "  make clean      Remove Next.js cache (.next/) and static export (out/)"
	@echo "  make dev        Run Next.js dev server on http://localhost:3000"
	@echo "  make build      Build static export to ./out"
	@echo "  make start      Serve the production build"
	@echo "  make lint       Run ESLint"
	@echo "  make lint-fix   Run ESLint with autofix"
	@echo "  make typecheck  Run TypeScript type checking"
	@echo "  make format     Run Prettier"

install:
	npm install

clean:
	rm -rf .next out

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

lint-fix:
	npm run lint:fix

typecheck:
	npm run typecheck

format:
	npm run format
