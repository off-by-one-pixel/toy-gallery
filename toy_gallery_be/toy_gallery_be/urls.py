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

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponseNotFound, JsonResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({"status": "ok"})


def spa_index(_request):
    """Catch-all for client-side routes in the bundled Next.js export.

    Django routes (`/admin/`, `/toys/`, `/api/`, `/health/`) resolve first;
    WhiteNoise serves any matching static file from the frontend dir; this
    runs only for unmatched paths so the SPA can handle them.
    """
    index_path = settings.BASE_DIR / "frontend" / "index.html"
    if not index_path.is_file():
        return HttpResponseNotFound()
    return FileResponse(index_path.open("rb"), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("toys/", include("toys.urls")),
    path("health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    re_path(r"^.*$", spa_index),
]
