"""Local-prod settings — import settings_docker and override only the bits
that don't make sense outside the container.

Used by ``make be-prod`` to reproduce production routing behavior locally
(Django + WhiteNoise serving the bundled Next.js export). settings_docker
is import-side-effect free since the /data mkdir moved to the entrypoint,
so we can just import it; SECRET_KEY and DB_URL are set via env first to
keep settings_docker's resolution logic from touching /data.
"""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEV_DB = REPO_ROOT / "toy_gallery_be" / "db.sqlite3"

# settings_docker resolves SECRET_KEY and DB_URL at import time; satisfy
# both via env so /data is never read or written during local-prod runs.
os.environ.setdefault("SECRET_KEY", "local-prod-not-a-real-secret")
os.environ.setdefault("DB_URL", f"sqlite:///{DEV_DB}")

from .settings_docker import *  # noqa: E402, F401, F403

# Point WhiteNoise at the live Next.js build instead of the path the
# Dockerfile copies the export to.
WHITENOISE_ROOT = REPO_ROOT / "cone-visualization" / "build"

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]
