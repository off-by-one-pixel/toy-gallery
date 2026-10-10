from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponseNotFound, JsonResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({"status": "ok"})


def _resolve_spa_html(url_path: str, frontend: Path) -> Path | None:
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
        if not resolved.is_relative_to(base):
            continue
        if resolved.is_file():
            return resolved
    return None


def spa_index(request):
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

if settings.SILK_ENABLED:
    urlpatterns.insert(-1, path("silk/", include("silk.urls", namespace="silk")))
