from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import SAFE_METHODS


class ReadOnlyTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None and not _allows_app_token(request):
            raise exceptions.PermissionDenied(
                "App tokens can only read data and start or stop sessions."
            )
        return result


def _allows_app_token(request):
    if request.method in SAFE_METHODS:
        return True
    view = request.parser_context.get("view")
    return getattr(view, "action", None) in getattr(view, "app_token_write_actions", ())
