from django.urls import include, path
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from . import views

router = routers.DefaultRouter()
router.register(r"toys", views.ToyViewSet)
router.register(r"sessions", views.SessionViewSet)


urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "change_password/",
        views.ChangePasswordView.as_view(),
        name="change_password",
    ),
    path("app_token/", views.AppTokenView.as_view(), name="app_token"),
    path("", include(router.urls)),
]
