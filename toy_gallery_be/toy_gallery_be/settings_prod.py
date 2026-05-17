import dj_database_url
from .settings import *
import os

DEBUG = False

ALLOWED_HOSTS = ["localhost", os.environ.get("COOLIFY_FQDN")]

SECRET_KEY = os.environ["SECRET_KEY"]
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

STATIC_ROOT = BASE_DIR / "staticfiles"

MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ["DB_URL"],
        conn_max_age=600,
        conn_health_checks=True,
    )
}

CORS_ALLOWED_ORIGINS = [os.environ["CORS_ALLOW_ORIGIN"]]
CORS_ALLOWED_ORIGIN_REGEXES = []
