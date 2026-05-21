"""Settings for the all-in-one self-hosted Docker image."""

import os
from pathlib import Path

from .settings import *  # noqa: F401, F403

DEBUG = False

# Container is single-tenant behind the operator's reverse proxy, so accept
# any Host header. Set CSRF_TRUSTED_ORIGINS to the public origin once fronted
# by HTTPS.
ALLOWED_HOSTS = ["*"]

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))


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

# `_MIGRATION_GATE_DB_OVERRIDE` is set internally by the migration safety
# gate (toys/migration_gate/) when it spawns a subprocess against a candidate
# DB; it is not a public configuration surface.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("_MIGRATION_GATE_DB_OVERRIDE", str(DATA_DIR / "db.sqlite3")),
    }
}
