from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import export as export_mod
from . import models, serializers


class ToyViewSet(viewsets.ModelViewSet):
    queryset = models.Toy.objects.all()
    serializer_class = serializers.ToySerializer

    @action(detail=False, methods=["get"])
    def export(self, request):
        handler = export_mod.latest()
        payload = handler.export(models.Toy.objects.all())
        response = Response(payload)
        filename = f"toy-gallery-{timezone.now():%Y%m%d}.json"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["post"], url_path="import")
    def import_toys(self, request):
        data = request.data
        if not isinstance(data, dict) or "version" not in data:
            raise drf_serializers.ValidationError(
                "Payload must be an object with a 'version' field."
            )
        handler = export_mod.for_version(data["version"])
        created = handler.import_(data)
        return Response({"created": created}, status=201)
