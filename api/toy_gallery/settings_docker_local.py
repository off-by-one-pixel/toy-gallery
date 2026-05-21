"""Local-prod settings — import settings_docker and override the bits that
don't make sense outside the container.

Used by ``make be-prod`` to reproduce production routing behavior locally
(Django + WhiteNoise serving the bundled Next.js export). SECRET_KEY and
DATA_DIR are set via env before importing settings_docker, so the
container's `/data` is never read or written.
"""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

os.environ.setdefault("SECRET_KEY", "local-prod-not-a-real-secret")
os.environ.setdefault("DATA_DIR", str(REPO_ROOT / "api"))

from .settings_docker import *  # noqa: E402, F401, F403

# Point WhiteNoise at the live Next.js build instead of the path the
# Dockerfile copies the export to.
WHITENOISE_ROOT = REPO_ROOT / "cone-visualization" / "build"

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]
