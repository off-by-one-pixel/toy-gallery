#!/bin/sh
# Entrypoint for the all-in-one self-hosted production image.
#
# Persistent state (SQLite DB + auto-generated SECRET_KEY) lives under /data.
# Mount a volume there to keep state across restarts:
#   docker run -p 8000:8000 -v ./data:/data ghcr.io/off-by-one-pixel/toy-gallery
#
# All env vars are optional:
#   DB_URL             database connection string; default sqlite:////data/db.sqlite3
#   SECRET_KEY         auto-generated to /data/.django_secret_key if unset
#   TRUSTED_ORIGINS    comma-separated public origins, e.g. https://your.domain
#   INITIAL_USERNAME   with INITIAL_PASSWORD bootstraps an admin on first run
#   INITIAL_PASSWORD   see above
#   INITIAL_EMAIL      optional, defaults to ""
#   PORT               listen port (default 8000)
#   WORKERS            web worker count (default 3)

set -eu

echo "[entrypoint] running migrations"
python manage.py migrate --noinput

echo "[entrypoint] collecting Django static files"
python manage.py collectstatic --noinput

echo "[entrypoint] checking superuser"
python /app/docker/init_superuser.py

echo "[entrypoint] starting web server on 0.0.0.0:${PORT:-8000}"
exec gunicorn toy_gallery_be.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WORKERS:-3}" \
  --access-logfile - \
  --error-logfile -
