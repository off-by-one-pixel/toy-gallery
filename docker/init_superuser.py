"""Idempotent admin bootstrap for the all-in-one Docker image.

If `INITIAL_USERNAME` and `INITIAL_PASSWORD` are both set and no user with
that username exists, create an admin with those credentials. Safe to run
on every container start — does nothing on subsequent runs once the user
exists.
"""

import os
import sys
from pathlib import Path

# This script lives at <project_root>/docker/init_superuser.py — make the
# Django project importable when invoked by absolute path.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import django

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402

username = os.environ.get("INITIAL_USERNAME")
password = os.environ.get("INITIAL_PASSWORD")
if not username or not password:
    sys.exit(0)

User = get_user_model()
if User.objects.filter(username=username).exists():
    print(f"[init_superuser] '{username}' already exists, skipping creation")
    sys.exit(0)

User.objects.create_superuser(
    username=username,
    password=password,
    email=os.environ.get("INITIAL_EMAIL", ""),
)
print(f"[init_superuser] created admin '{username}'")
