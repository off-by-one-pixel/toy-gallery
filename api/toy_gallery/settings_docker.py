import os
from pathlib import Path

from .settings import *  # noqa: F401, F403

DEBUG = False

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

CORS_ALLOWED_ORIGINS = []
CORS_ALLOWED_ORIGIN_REGEXES = []

STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405
WHITENOISE_ROOT = BASE_DIR / "frontend"  # noqa: F405
WHITENOISE_INDEX_FILE = True
MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
MIDDLEWARE.insert(2, "django.middleware.gzip.GZipMiddleware")  # noqa: F405

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}


def _immutable_asset(path: str, url: str) -> bool:
    return "/_next/static/" in url


WHITENOISE_IMMUTABLE_FILE_TEST = _immutable_asset

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("_MIGRATION_GATE_DB_OVERRIDE", str(DATA_DIR / "db.sqlite3")),
    }
}
