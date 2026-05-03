from collections import defaultdict
from datetime import timedelta

from django.db.models.deletion import ProtectedError
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import export as export_mod
from . import models, serializers
from .dimensions import SessionDimensions


class ToyViewSet(viewsets.ModelViewSet):
    queryset = models.Toy.objects.all()
    serializer_class = serializers.ToySerializer

    def destroy(self, request, *args, **kwargs):
        toy = self.get_object()
        try:
            toy.delete()
        except ProtectedError:
            count = models.ToySessionEntry.objects.filter(toy=toy).count()
            return Response(
                {
                    "detail": (
                        f"Cannot delete this toy because it appears in {count} "
                        f"session{'s' if count != 1 else ''}."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses=serializers.ExportEnvelopeSerializer)
    @action(detail=False, methods=["get"])
    def export(self, request):
        handler = export_mod.latest()
        payload = handler.export(models.Toy.objects.all())
        response = Response(payload)
        filename = f"toy-gallery-{timezone.now():%Y%m%d}.json"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @extend_schema(
        request=serializers.ExportEnvelopeSerializer,
        responses={201: serializers.ImportSummarySerializer},
    )
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


ACTIVITY_WINDOW_DAYS = 365


class SessionViewSet(viewsets.ModelViewSet):
    queryset = (
        models.Session.objects.prefetch_related("entries", "entries__toy")
        .order_by("-started_at")
    )
    serializer_class = serializers.SessionSerializer

    @extend_schema(responses=serializers.ActivityResponseSerializer)
    @action(detail=False, methods=["get"], url_path="activity")
    def activity(self, request):
        cutoff = timezone.now() - timedelta(days=ACTIVITY_WINDOW_DAYS - 1)
        sessions = (
            models.Session.objects.filter(started_at__gte=cutoff)
            .prefetch_related("entries", "entries__toy", "entries__toy__shape__sections")
        )

        buckets: dict = defaultdict(list)
        for session in sessions:
            local_date = timezone.localtime(session.started_at).date()
            buckets[local_date].append(session)

        days = []
        for day, day_sessions in sorted(buckets.items()):
            lengths = [
                v for v in (SessionDimensions.peak_length(s) for s in day_sessions) if v is not None
            ]
            circs = [
                v for v in (SessionDimensions.peak_circumference(s) for s in day_sessions) if v is not None
            ]
            days.append(
                {
                    "date": day,
                    "session_count": len(day_sessions),
                    "max_insertable_length": max(lengths) if lengths else None,
                    "max_circumference": max(circs) if circs else None,
                }
            )

        return Response({"days": days})
