
from django.db import IntegrityError, transaction
from django.db.models import Count, Sum
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from . import export as export_mod
from . import media, models, serializers, stats


class ToyViewSet(viewsets.ModelViewSet):
    queryset = models.Toy.objects.annotate(
        usage_count=Count("toysessionentry"),
        total_duration_minutes=Sum("toysessionentry__duration_minutes"),
    )
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
        return Response(handler.import_(data), status=201)

    @extend_schema(responses={200: serializers.DeleteCollectionSummarySerializer})
    @action(detail=False, methods=["delete"], url_path="delete_all")
    def delete_all(self, request):
        with transaction.atomic():
            sessions_deleted = models.Session.objects.count()
            toys_deleted = models.Toy.objects.count()
            # Sessions first — ToySessionEntry.toy is on_delete=PROTECT.
            # Then toys, then shapes — Toy.shape is a OneToOneField that
            # cascades from Shape to Toy, not the other way, so shapes are
            # left orphaned by toy deletion and we wipe them explicitly.
            models.Session.objects.all().delete()
            models.Toy.objects.all().delete()
            models.Shape.objects.all().delete()
        return Response(
            {"toys_deleted": toys_deleted, "sessions_deleted": sessions_deleted}
        )


class SessionViewSet(viewsets.ModelViewSet):
    queryset = (
        models.Session.objects.prefetch_related("entries", "entries__toy")
        .order_by("-started_at")
    )
    serializer_class = serializers.SessionSerializer

    @extend_schema(request=None, responses=serializers.SessionSerializer)
    @action(detail=False, methods=["post"], url_path="start")
    def start(self, request):
        live = models.Session.objects.filter(is_live=True).first()
        if live is None:
            try:
                with transaction.atomic():
                    live = models.Session.objects.create(
                        started_at=timezone.now(), is_live=True
                    )
            except IntegrityError:
                live = models.Session.objects.filter(is_live=True).first()
        return Response(serializers.SessionSerializer(live).data)

    @extend_schema(responses=serializers.LiveSessionResponseSerializer)
    @action(detail=False, methods=["get"], url_path="live")
    def live(self, request):
        live = models.Session.objects.filter(is_live=True).first()
        session = serializers.SessionSerializer(live).data if live else None
        return Response({"session": session})

    @extend_schema(responses=serializers.SessionMediaResponseSerializer)
    @action(detail=True, methods=["get"], url_path="media")
    def media(self, request, pk=None):
        session = self.get_object()
        result = media.get_provider().session_media(
            session.id, session.started_at, session.ended_at
        )
        if result.authoritative:
            has_media = bool(result.items)
            if session.has_media != has_media:
                session.has_media = has_media
                session.save(update_fields=["has_media"])
        return Response({"configured": result.configured, "items": result.items})

    @extend_schema(responses=serializers.SessionMediaIndicatorsSerializer)
    @action(detail=False, methods=["get"], url_path="media-indicators")
    def media_indicators(self, request):
        if not media.get_provider().is_configured():
            return Response({"configured": False, "session_ids": []})
        flagged = models.Session.objects.filter(has_media=True).order_by("id")
        session_ids = list(flagged.values_list("id", flat=True))
        return Response({"configured": True, "session_ids": session_ids})

    @extend_schema(request=None, responses=serializers.SessionMediaIndicatorsSerializer)
    @action(detail=False, methods=["post"], url_path="refresh-media")
    def refresh_media(self, request):
        sessions = list(
            models.Session.objects.order_by("id").values_list("id", "started_at", "ended_at")
        )
        result = media.get_provider().refresh_all_media(sessions)
        if result.authoritative:
            models.Session.objects.filter(id__in=result.session_ids).update(has_media=True)
            models.Session.objects.exclude(id__in=result.session_ids).update(has_media=False)
        return Response({"configured": result.configured, "session_ids": result.session_ids})

    @extend_schema(
        parameters=[serializers.SessionStatsQuerySerializer],
        responses=serializers.SessionStatsResponseSerializer,
    )
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        query = serializers.SessionStatsQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        lower, upper = stats.range_bounds(params.get("start"), params.get("end"), params["tz"])
        sessions = models.Session.objects.prefetch_related("entries", "entries__toy")
        if lower is not None:
            sessions = sessions.filter(started_at__gte=lower)
        if upper is not None:
            sessions = sessions.filter(started_at__lt=upper)
        groups = stats.compute_stats(sessions, params["group_by"], params["metrics"], params["tz"])
        return Response({"groups": groups})


class ChangePasswordView(APIView):
    @extend_schema(
        request=serializers.ChangePasswordSerializer,
        responses={204: None},
    )
    def post(self, request):
        s = serializers.ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        s.is_valid(raise_exception=True)
        s.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
