#!/bin/sh

set -eu

DATA_DIR="${DATA_DIR:-/data}"
export DATA_DIR
mkdir -p "$DATA_DIR"

echo "[entrypoint] running migration safety gate"
python manage.py safe_migrate

echo "[entrypoint] collecting Django static files"
python manage.py collectstatic --noinput

echo "[entrypoint] checking superuser"
python /app/docker/init_superuser.py

SSL_CERT_PATH="${SSL_CERT_PATH:-$DATA_DIR/certs/cert.pem}"
SSL_KEY_PATH="${SSL_KEY_PATH:-$DATA_DIR/certs/key.pem}"

if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
  echo "[entrypoint] starting web server on 0.0.0.0:${PORT:-8000} (HTTPS)"
  exec gunicorn toy_gallery.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${WORKERS:-3}" \
    --certfile "$SSL_CERT_PATH" \
    --keyfile "$SSL_KEY_PATH" \
    --access-logfile - \
    --error-logfile -
fi

echo "[entrypoint] starting web server on 0.0.0.0:${PORT:-8000} (HTTP)"
exec gunicorn toy_gallery.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WORKERS:-3}" \
  --access-logfile - \
  --error-logfile -
