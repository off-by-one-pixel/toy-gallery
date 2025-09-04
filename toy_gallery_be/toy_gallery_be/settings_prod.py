from .settings import *
import os

DEBUG = False

ALLOWED_HOSTS = ["localhost", "toys.example.com"]

SECRET_KEY = os.environ["SECRET_KEY"]
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

STATIC_ROOT = BASE_DIR / "staticfiles"

MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
