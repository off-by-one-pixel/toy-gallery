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
#   SSL_CERT_PATH      path to TLS cert (default /data/certs/cert.pem)
#   SSL_KEY_PATH       path to TLS key  (default /data/certs/key.pem)
# If both cert and key files exist, gunicorn serves HTTPS; otherwise HTTP.

set -eu

echo "[entrypoint] running migrations"
python manage.py migrate --noinput

echo "[entrypoint] collecting Django static files"
python manage.py collectstatic --noinput

echo "[entrypoint] checking superuser"
python /app/docker/init_superuser.py

SSL_CERT_PATH="${SSL_CERT_PATH:-/data/certs/cert.pem}"
SSL_KEY_PATH="${SSL_KEY_PATH:-/data/certs/key.pem}"

if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
  echo "[entrypoint] starting web server on 0.0.0.0:${PORT:-8000} (HTTPS)"
  exec gunicorn toy_gallery_be.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${WORKERS:-3}" \
    --certfile "$SSL_CERT_PATH" \
    --keyfile "$SSL_KEY_PATH" \
    --access-logfile - \
    --error-logfile -
fi

echo "[entrypoint] starting web server on 0.0.0.0:${PORT:-8000} (HTTP)"
exec gunicorn toy_gallery_be.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WORKERS:-3}" \
  --access-logfile - \
  --error-logfile -
