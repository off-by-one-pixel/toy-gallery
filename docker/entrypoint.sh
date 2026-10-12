#!/bin/sh

set -eu

DATA_DIR="${DATA_DIR:-/data}"
export DATA_DIR
mkdir -p "$DATA_DIR"

echo "[entrypoint] running migration safety gate"
python manage.py safe_migrate

echo "[entrypoint] collecting Django static files"
python manage.py collectstatic --noinput

if [ -n "${INITIAL_USERNAME:-}" ] && [ -n "${INITIAL_PASSWORD:-}" ]; then
  echo "[entrypoint] checking admin '$INITIAL_USERNAME'"
  if result=$(
    DJANGO_SUPERUSER_USERNAME="$INITIAL_USERNAME" \
    DJANGO_SUPERUSER_PASSWORD="$INITIAL_PASSWORD" \
    DJANGO_SUPERUSER_EMAIL="${INITIAL_EMAIL:-}" \
      python manage.py createsuperuser --noinput 2>&1
  ); then
    echo "[entrypoint] $result"
  else
    case "$result" in
      *"already taken"*) echo "[entrypoint] admin '$INITIAL_USERNAME' already exists, skipping creation" ;;
      *) echo "$result" >&2; exit 1 ;;
    esac
  fi
fi

SSL_CERT_PATH="${SSL_CERT_PATH:-$DATA_DIR/certs/cert.pem}"
SSL_KEY_PATH="${SSL_KEY_PATH:-$DATA_DIR/certs/key.pem}"

set -- --bind "0.0.0.0:${PORT:-8000}" --workers "${WORKERS:-3}" --access-logfile - --error-logfile -
SCHEME=HTTP
if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
  set -- "$@" --certfile "$SSL_CERT_PATH" --keyfile "$SSL_KEY_PATH"
  SCHEME=HTTPS
fi

echo "[entrypoint] starting web server on 0.0.0.0:${PORT:-8000} ($SCHEME)"
exec gunicorn toy_gallery.wsgi:application "$@"
