import importlib.util
import os
import sys
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = "django-insecure-x%%2@3q_#odlqf25liziatjz(i^rt4x6a!5#jd@bgve#(y2q42"

DEBUG = True

ALLOWED_HOSTS = []


DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
]

LOCAL_APPS = [
    "toys",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIGRATION_SMOKE_TEST_PATHS = [
    "/toys/toys/",
    "/toys/sessions/",
]

MIGRATION_ARCHIVE_RETAIN = 5

IMMICH_URL = os.environ.get("IMMICH_URL", "").rstrip("/")
IMMICH_PUBLIC_URL = os.environ.get("IMMICH_PUBLIC_URL", "").rstrip("/") or IMMICH_URL
IMMICH_API_KEY = os.environ.get("IMMICH_API_KEY", "")
SESSION_MEDIA_WINDOW_MINUTES = int(os.environ.get("SESSION_MEDIA_WINDOW_MINUTES", "60"))
SESSION_MEDIA_LINK_MINUTES = int(os.environ.get("SESSION_MEDIA_LINK_MINUTES", "30"))

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

SILK_ENABLED = (
    DEBUG
    and "test" not in sys.argv
    and os.environ.get("DJANGO_SETTINGS_MODULE", "toy_gallery.settings") == "toy_gallery.settings"
    and importlib.util.find_spec("silk") is not None
)
if SILK_ENABLED:
    INSTALLED_APPS += ["silk"]
    MIDDLEWARE.append("silk.middleware.SilkyMiddleware")

ROOT_URLCONF = "toy_gallery.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "toy_gallery.wsgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


STATIC_URL = "static/"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "toys.authentication.ReadOnlyTokenAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Toy Gallery API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "SectionShapeEnum": "toys.models.Shape.CAP_SHAPE_CHOICES",
        "CurveAngleEnum": "toys.models.ShapeSection.CURVE_ANGLE_CHOICES",
        "SessionMediaKindEnum": "toys.serializers.SESSION_MEDIA_KINDS",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]
