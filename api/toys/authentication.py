from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import SAFE_METHODS


class ReadOnlyTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None and request.method not in SAFE_METHODS:
            raise exceptions.PermissionDenied("App tokens are read-only.")
        return result
