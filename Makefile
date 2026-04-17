.PHONY: help be fe

help:
	@echo "Targets:"
	@echo "  make be   Run Django backend on 0.0.0.0:8000 (Ctrl+C to stop)"
	@echo "  make fe   Run Next.js frontend dev server (Ctrl+C to stop)"
	@echo "For both, run 'make be' and 'make fe' in separate terminals."

be:
	cd toy_gallery_be && uv run python manage.py runserver 0.0.0.0:8000

fe:
	cd cone-visualization && npm run dev
