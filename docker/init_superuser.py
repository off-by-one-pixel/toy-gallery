import os
import sys
from pathlib import Path

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
