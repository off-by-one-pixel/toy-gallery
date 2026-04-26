"""Settings for the all-in-one self-hosted Docker image.

The operator brings their own DB and (optionally) admin credentials via env
vars; everything else is preconfigured. Persistent state — SQLite DB and the
auto-generated SECRET_KEY — lives under /data, expected to be a volume mount.
"""

import os
from pathlib import Path

import dj_database_url

from .settings import *  # noqa: F401, F403

DEBUG = False

# Single-tenant container — the operator owns the reverse proxy in front, so
# the container itself accepts any Host header. Set CSRF_TRUSTED_ORIGINS to
# the public origin once you front it with HTTPS.
ALLOWED_HOSTS = ["*"]

DATA_DIR = Path("/data")
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_secret_key() -> str:
    env_key = os.environ.get("SECRET_KEY")
    if env_key:
        return env_key
    key_file = DATA_DIR / ".django_secret_key"
    if key_file.exists():
        return key_file.read_text().strip()
    from django.core.management.utils import get_random_secret_key

    new_key = get_random_secret_key()
    key_file.write_text(new_key)
    key_file.chmod(0o600)
    return new_key


SECRET_KEY = _resolve_secret_key()

CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get("TRUSTED_ORIGINS", "").split(",") if o.strip()
]

# Same-origin: Django serves both the API and the bundled Next.js export, so
# cross-origin requests are not part of this deployment. Flatten any
# wildcards inherited from base settings.
CORS_ALLOWED_ORIGINS = []
CORS_ALLOWED_ORIGIN_REGEXES = []

# Bundled Next.js static export at the URL root (see Dockerfile).
STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405
WHITENOISE_ROOT = BASE_DIR / "frontend"  # noqa: F405
WHITENOISE_INDEX_FILE = True
MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DB_URL", f"sqlite:///{DATA_DIR}/db.sqlite3"),
        conn_max_age=600,
        conn_health_checks=True,
    )
}
