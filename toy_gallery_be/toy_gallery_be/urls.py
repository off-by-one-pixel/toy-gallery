"""
URL configuration for toy_gallery_be project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from pathlib import Path
from typing import Optional

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponseNotFound, JsonResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({"status": "ok"})


def _resolve_spa_html(url_path: str, frontend: Path) -> Optional[Path]:
    """Find the static HTML produced by Next.js for an SPA route.

    Next.js's `output: 'export'` writes per-route files: ``/sessions`` becomes
    ``sessions.html``; nested routes like ``/sessions/edit`` become
    ``sessions/edit.html``. WhiteNoise only serves exact-path matches, so a
    bare ``/sessions`` request misses the ``.html`` file and falls through
    here. Try the matching file first; fall back to root ``index.html`` so a
    deep refresh on an unknown route still loads the SPA shell.
    """
    safe = url_path.strip("/")
    candidates: list[Path] = []
    if safe:
        candidates.append(frontend / f"{safe}.html")
        candidates.append(frontend / safe / "index.html")
    candidates.append(frontend / "index.html")

    base = frontend.resolve()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except (OSError, RuntimeError):
            continue
        # Reject anything that escaped the frontend dir via traversal.
        if not resolved.is_relative_to(base):
            continue
        if resolved.is_file():
            return resolved
    return None


def spa_index(request):
    """Catch-all for client-side routes in the bundled Next.js export.

    Django routes (`/admin/`, `/toys/`, `/api/`, `/health/`) resolve first;
    WhiteNoise serves any matching static file from the frontend dir; this
    runs only for paths WhiteNoise didn't match, so the SPA can handle them.
    Reads ``WHITENOISE_ROOT`` so the SPA-serving deployments (Docker, local
    prod-like) configure the dir in one place; in dev the setting is unset
    and this view returns 404 (dev's runserver shouldn't reach it anyway).
    """
    frontend = getattr(settings, "WHITENOISE_ROOT", None)
    if frontend is None:
        return HttpResponseNotFound()
    html = _resolve_spa_html(request.path, Path(frontend))
    if html is None:
        return HttpResponseNotFound()
    return FileResponse(html.open("rb"), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("toys/", include("toys.urls")),
    path("health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    re_path(r"^.*$", spa_index),
]
