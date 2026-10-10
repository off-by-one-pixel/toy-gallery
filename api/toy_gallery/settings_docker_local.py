import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

os.environ.setdefault("SECRET_KEY", "local-prod-not-a-real-secret")
os.environ.setdefault("DATA_DIR", str(REPO_ROOT / "api"))

from .settings_docker import *  # noqa: E402, F401, F403

WHITENOISE_ROOT = REPO_ROOT / "web" / "build"

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]
