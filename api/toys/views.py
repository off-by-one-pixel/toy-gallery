from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Case, Count, Exists, F, Max, OuterRef, Prefetch, Q, Sum, When
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce, ExtractHour
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from . import export as export_mod
from . import models, serializers, stats
from .immich import ImmichMediaProvider
from .records.session import resync_records


class ToyViewSet(viewsets.ModelViewSet):
    queryset = models.Toy.objects.prefetch_related(
        "shape__sections",
        Prefetch(
            "records",
            queryset=models.PersonalRecord.objects.order_by(
                "key", "-session__started_at", "-id"
            ).select_related("session"),
        ),
    ).annotate(
        usage_count=Count("toysessionentry"),
        total_duration_minutes=Coalesce(Sum("toysessionentry__duration_minutes"), 0),
        max_duration_minutes=Coalesce(Max("toysessionentry__duration_minutes"), 0),
    )
    serializer_class = serializers.ToySerializer

    def perform_create(self, serializer):
        serializer.save()
        self._reload_annotated(serializer)

    def perform_update(self, serializer):
        serializer.save()
        self._reload_annotated(serializer)

    def _reload_annotated(self, serializer):
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def destroy(self, request, *args, **kwargs):
        toy = self.get_object()
        try:
            with transaction.atomic():
                toy.shape.delete()
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

    @extend_schema(responses=serializers.AttributeSuggestionSerializer(many=True))
    @action(detail=False, methods=["get"], url_path="attribute-suggestions")
    def attribute_suggestions(self, request):
        canonical: dict[str, str] = {}
        values: dict[str, set[str]] = {}
        for attrs in models.Toy.objects.values_list("custom_attributes", flat=True):
            for raw_key, raw_value in (attrs or {}).items():
                key = raw_key.strip()
                if not key:
                    continue
                fold = key.casefold()
                canonical.setdefault(fold, key)
                value = str(raw_value).strip()
                if value:
                    values.setdefault(fold, set()).add(value)
        data = [
            {
                "key": canonical[fold],
                "values": sorted(values.get(fold, set()), key=lambda v: (v.casefold(), v)),
            }
            for fold in sorted(canonical)
        ]
        return Response(serializers.AttributeSuggestionSerializer(data, many=True).data)

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
            models.Session.objects.all().delete()
            models.Toy.objects.all().delete()
            models.Shape.objects.all().delete()
        return Response({"toys_deleted": toys_deleted, "sessions_deleted": sessions_deleted})


class SessionPagination(PageNumberPagination):
    page_size = 20


def _session_ordering_annotation(field):
    if field == "duration":
        return Sum("entries__duration_minutes")
    if field == "length":
        return Max(
            Case(
                When(
                    entries__involvement=models.ToySessionEntry.FULLY_INSERTED,
                    then="entries__toy__insertable_length",
                )
            )
        )
    return Max(
        Case(
            When(
                entries__involvement__in=[
                    models.ToySessionEntry.INSERTED,
                    models.ToySessionEntry.FULLY_INSERTED,
                ],
                then="entries__toy__circumference",
            )
        )
    )


def _apply_session_ordering(queryset, ordering):
    field = ordering.removeprefix("-")
    descending = ordering.startswith("-")
    if field == "started_at":
        expression = F("started_at")
    else:
        queryset = queryset.annotate(**{f"sort_{field}": _session_ordering_annotation(field)})
        expression = F(f"sort_{field}")
    ordered = expression.desc(nulls_last=True) if descending else expression.asc(nulls_last=True)
    return queryset.order_by(F("is_live").desc(), ordered, "-id")


def _with_filter_aliases(queryset, params):
    if params.get("time_from") is not None:
        tz = params["tz"]
        queryset = queryset.alias(
            local_start_hour=ExtractHour("started_at", tzinfo=tz),
            local_end_hour=ExtractHour(Coalesce("ended_at", "started_at"), tzinfo=tz),
        )
    return queryset


def _hour_segment_q(first, last):
    session_wraps = Q(local_end_hour__lt=F("local_start_hour"))
    straight = ~session_wraps & Q(local_start_hour__lte=last, local_end_hour__gte=first)
    wrapped = session_wraps & (Q(local_start_hour__lte=last) | Q(local_end_hour__gte=first))
    return straight | wrapped


def _time_window_q(time_from, time_to):
    covers_full_day = Q(ended_at__gte=F("started_at") + timedelta(days=1))
    return covers_full_day | _hour_segment_q(time_from, time_to - 1)


def _session_filter_q(params):
    filters = Q()
    if params.get("time_from") is not None:
        filters &= _time_window_q(params["time_from"], params["time_to"])
    toy_ids = params.get("toys")
    if toy_ids:
        filters &= Q(
            Exists(models.ToySessionEntry.objects.filter(session=OuterRef("pk"), toy__in=toy_ids))
        )
    if params.get("has_media"):
        filters &= Q(photo_count__gt=0) | Q(video_count__gt=0)

    if params.get("has_pr"):
        filters &= Q(Exists(models.PersonalRecord.objects.filter(session=OuterRef("pk"))))
    return filters


def _filter_sessions(queryset, params):
    queryset = _with_filter_aliases(queryset, params)
    lower, upper = stats.range_bounds(params.get("start"), params.get("end"), params["tz"])
    window = _session_filter_q(params)
    if lower is not None:
        window &= Q(started_at__gte=lower)
    if upper is not None:
        window &= Q(started_at__lt=upper)
    return queryset.filter(window) if window else queryset


def _store_media_counts(counts):
    changed = []
    for session in models.Session.objects.all():
        new = counts.get(session.id)
        photos = new.photos if new else 0
        videos = new.videos if new else 0
        if session.photo_count != photos or session.video_count != videos:
            session.photo_count = photos
            session.video_count = videos
            changed.append(session)
    if changed:
        models.Session.objects.bulk_update(changed, ["photo_count", "video_count"])


@extend_schema_view(
    list=extend_schema(parameters=[serializers.SessionListQuerySerializer]),
)
class SessionViewSet(viewsets.ModelViewSet):
    queryset = models.Session.objects.prefetch_related(
        "entries",
        "entries__toy",
        Prefetch("records", queryset=models.PersonalRecord.objects.select_related("toy_entry")),
    ).order_by("-is_live", "-started_at", "-id")
    serializer_class = serializers.SessionSerializer
    pagination_class = SessionPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset
        query = serializers.SessionListQuerySerializer(data=self.request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        queryset = _filter_sessions(queryset, params)
        ordering = params.get("ordering")
        if ordering:
            queryset = _apply_session_ordering(queryset, ordering)
        return queryset

    @extend_schema(request=None, responses=serializers.SessionSerializer)
    @action(detail=False, methods=["post"], url_path="start")
    def start(self, request):
        live = models.Session.objects.filter(is_live=True).first()
        if live is None:
            try:
                with transaction.atomic():
                    live = models.Session.objects.create(started_at=timezone.now(), is_live=True)
            except IntegrityError:
                live = models.Session.objects.filter(is_live=True).first()
        return Response(serializers.SessionSerializer(live).data)

    @extend_schema(responses=serializers.LiveSessionResponseSerializer)
    @action(detail=False, methods=["get"], url_path="live")
    def live(self, request):
        live = self.queryset.filter(is_live=True).first()
        session = serializers.SessionSerializer(live).data if live else None
        return Response({"session": session})

    @extend_schema(responses=serializers.SessionMediaResponseSerializer)
    @action(detail=True, methods=["get"], url_path="media")
    def media(self, request, pk=None):
        session = self.get_object()
        result = ImmichMediaProvider().session_media(
            session.id, session.started_at, session.ended_at
        )
        if result.authoritative:
            videos = sum(1 for item in result.items if item["kind"] == "video")
            photos = len(result.items) - videos
            if session.photo_count != photos or session.video_count != videos:
                session.photo_count = photos
                session.video_count = videos
                session.save(update_fields=["photo_count", "video_count"])
        return Response(
            {
                "configured": result.configured,
                "items": result.items,
                "share_url": result.share_url,
            }
        )

    @extend_schema(responses=serializers.MediaStatusSerializer)
    @action(detail=False, methods=["get"], url_path="media-status")
    def media_status(self, request):
        return Response({"configured": ImmichMediaProvider().is_configured()})

    @extend_schema(
        request=serializers.MediaLikeRequestSerializer,
        responses=serializers.MediaLikeResponseSerializer,
    )
    @action(detail=False, methods=["post"], url_path="media-like")
    def media_like(self, request):
        body = serializers.MediaLikeRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        result = ImmichMediaProvider().set_media_liked(
            body.validated_data["asset_id"], body.validated_data["liked"]
        )
        if not result.configured:
            return Response(
                {"detail": "Media provider is not configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not result.authoritative:
            return Response(
                {"detail": "Media provider is unavailable."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"liked": result.liked})

    @extend_schema(request=None, responses=serializers.RefreshMediaResponseSerializer)
    @action(detail=False, methods=["post"], url_path="refresh-media")
    def refresh_media(self, request):
        sessions = list(
            models.Session.objects.order_by("id").values_list("id", "started_at", "ended_at")
        )
        result = ImmichMediaProvider().refresh_all_media(sessions)
        if result.authoritative:
            _store_media_counts(result.counts)
        return Response(
            {"configured": result.configured, "sessions_with_media": len(result.counts)}
        )

    @extend_schema(
        parameters=[serializers.SessionStatsQuerySerializer],
        responses=serializers.SessionStatsResponseSerializer,
    )
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        query = serializers.SessionStatsQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params = query.validated_data
        sessions = _filter_sessions(
            models.Session.objects.prefetch_related("entries", "entries__toy"), params
        )
        groups = stats.compute_stats(sessions, params["group_by"], params["metrics"], params["tz"])
        return Response({"groups": groups})

    @extend_schema(
        request=None,
        responses=serializers.SessionRecordsRebuildResponseSerializer,
    )
    @action(detail=False, methods=["post"], url_path="rebuild-records")
    def rebuild_records(self, _):
        resync_records()
        return Response({"records": models.PersonalRecord.objects.count()})


class ChangePasswordView(APIView):
    @extend_schema(
        request=serializers.ChangePasswordSerializer,
        responses={204: None},
    )
    def post(self, request):
        s = serializers.ChangePasswordSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        s.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
