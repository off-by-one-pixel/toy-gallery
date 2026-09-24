from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from toys.records.session import record_session

from . import models, stats
from .dimensions import SessionDimensions


class ToyShapeSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ShapeSection
        fields = [
            "id",
            "order",
            "height",
            "diameter",
            "circumference",
            "color",
            "top_curve_angle",
            "bottom_curve_angle",
        ]


class ToyShapeSerializer(serializers.ModelSerializer):
    sections = ToyShapeSectionSerializer(many=True)

    class Meta:
        model = models.Shape
        fields = ["top_section_shape", "bottom_section_shape", "sections"]

    def create(self, validated_data):
        sections_data = validated_data.pop("sections")
        shape = models.Shape.objects.create(**validated_data)
        for s in sections_data:
            models.ShapeSection.objects.create(**s, shape=shape)
        return shape

    def update(self, instance, validated_data):
        # Sections are wholesale-replaced rather than reconciled by id —
        # the editor doesn't track stable section ids on the client (the
        # SVG editor uses its own row keys), and a full replace lets the
        # client send the rendered list verbatim.
        sections_data = validated_data.pop("sections", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if sections_data is not None:
            instance.sections.all().delete()
            for s in sections_data:
                models.ShapeSection.objects.create(**s, shape=instance)
        return instance


class ToyRecordSerializer(serializers.ModelSerializer):
    achieved_at = serializers.DateTimeField(source="session.started_at", read_only=True)

    class Meta:
        model = models.PersonalRecord
        fields = ["key", "value", "achieved_at"]


class ToySerializer(serializers.ModelSerializer):
    shape = ToyShapeSerializer()
    records = ToyRecordSerializer(many=True, read_only=True)
    custom_attributes = serializers.DictField(
        child=serializers.CharField(allow_blank=True),
        required=False,
    )
    usage_count = serializers.IntegerField(read_only=True)
    total_duration_minutes = serializers.IntegerField(read_only=True)
    max_duration_minutes = serializers.IntegerField(read_only=True)

    def validate_custom_attributes(self, value):
        return {k.strip(): v for k, v in value.items() if k.strip()}

    class Meta:
        model = models.Toy
        fields = [
            "id",
            "brand",
            "name",
            "shape",
            "size",
            "date_purchased",
            "retired",
            "color",
            "insertable_length",
            "total_length",
            "circumference",
            "custom_attributes",
            "usage_count",
            "total_duration_minutes",
            "max_duration_minutes",
            "records",
        ]

    def create(self, validated_data):
        shape_data = validated_data.pop("shape")
        shape_serializer = self.fields["shape"]
        shape_serializer.initial_data = shape_data
        shape_serializer.is_valid()
        shape = shape_serializer.save()
        return models.Toy.objects.create(**validated_data, shape=shape)

    @transaction.atomic
    def update(self, instance, validated_data):
        shape_data = validated_data.pop("shape", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if shape_data is not None:
            self.fields["shape"].update(instance.shape, shape_data)
        return instance


class ToySessionEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ToySessionEntry
        fields = ["toy", "involvement", "duration_minutes"]


class PersonalRecordSerializer(serializers.ModelSerializer):
    toy = serializers.IntegerField(
        source="toy_entry.toy_id", read_only=True, allow_null=True, default=None
    )
    achieved_at = serializers.DateTimeField(source="session.started_at", read_only=True)

    class Meta:
        model = models.PersonalRecord
        fields = ["value", "key", "toy", "achieved_at"]


class SessionSerializer(serializers.ModelSerializer):
    entries = ToySessionEntrySerializer(many=True)
    records = PersonalRecordSerializer(many=True, read_only=True)
    max_insertable_length = serializers.SerializerMethodField()
    max_circumference = serializers.SerializerMethodField()
    total_toy_duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = models.Session
        fields = [
            "id",
            "started_at",
            "ended_at",
            "is_live",
            "photo_count",
            "video_count",
            "entries",
            "records",
            "max_insertable_length",
            "max_circumference",
            "total_toy_duration_minutes",
        ]
        read_only_fields = ["is_live"]

    def get_total_toy_duration_minutes(self, obj) -> int | None:
        return SessionDimensions.total_toy_duration(obj)

    def get_max_insertable_length(self, obj) -> float | None:
        return SessionDimensions.peak_length(obj)

    def get_max_circumference(self, obj) -> float | None:
        return SessionDimensions.peak_circumference(obj)

    def validate(self, attrs):
        started_at = attrs.get("started_at", getattr(self.instance, "started_at", None))
        ended_at = attrs.get("ended_at", getattr(self.instance, "ended_at", None))
        if started_at and ended_at and ended_at <= started_at:
            raise serializers.ValidationError({"ended_at": "Session end must be after its start."})
        return attrs

    def validate_entries(self, entries):
        if not entries:
            raise serializers.ValidationError("A session must include at least one toy.")
        toy_ids = [e["toy"].pk for e in entries]
        if len(set(toy_ids)) != len(toy_ids):
            raise serializers.ValidationError("Each toy can appear only once per session.")
        return entries

    def create(self, validated_data):
        entries_data = validated_data.pop("entries")
        session = models.Session.objects.create(**validated_data)
        models.ToySessionEntry.objects.bulk_create(
            [models.ToySessionEntry(session=session, **e) for e in entries_data]
        )
        record_session(session)
        return session

    def update(self, instance, validated_data):
        entries_data = validated_data.pop("entries", None)
        instance.started_at = validated_data.get("started_at", instance.started_at)
        instance.ended_at = validated_data.get("ended_at", instance.ended_at)
        if instance.ended_at is not None:
            instance.is_live = False
        instance.save()
        if entries_data is not None:
            instance.entries.all().delete()
            models.ToySessionEntry.objects.bulk_create(
                [models.ToySessionEntry(session=instance, **e) for e in entries_data]
            )
        record_session(instance)
        return instance


class LiveSessionResponseSerializer(serializers.Serializer):
    session = SessionSerializer(allow_null=True)


class SessionRecordsRebuildResponseSerializer(serializers.Serializer):
    records = serializers.IntegerField()


class DateWindowQuerySerializer(serializers.Serializer):
    start = serializers.DateField(required=False)
    end = serializers.DateField(required=False)
    tz = serializers.CharField(required=False, default="UTC")

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")
        if start and end and end < start:
            raise serializers.ValidationError({"end": "end must not precede start."})
        try:
            attrs["tz"] = ZoneInfo(attrs.get("tz") or "UTC")
        except (ZoneInfoNotFoundError, ValueError) as err:
            raise serializers.ValidationError({"tz": "Unknown timezone."}) from err
        return attrs


SESSION_ORDERING_FIELDS = ["started_at", "duration", "length", "circumference"]
SESSION_ORDERING_CHOICES = [
    prefix + field for field in SESSION_ORDERING_FIELDS for prefix in ("", "-")
]


class ToyIdListField(serializers.ListField):
    child = serializers.IntegerField()

    def to_internal_value(self, data):
        is_single_csv = isinstance(data, list) and len(data) == 1 and isinstance(data[0], str)
        if is_single_csv and "," in data[0]:
            data = [part for part in data[0].split(",") if part.strip()]
        return super().to_internal_value(data)


class SessionFilterQuerySerializer(DateWindowQuerySerializer):
    toys = ToyIdListField(required=False)
    has_media = serializers.BooleanField(required=False)
    has_pr = serializers.BooleanField(required=False)
    time_from = serializers.IntegerField(required=False, min_value=0, max_value=23)
    time_to = serializers.IntegerField(required=False, min_value=1, max_value=24)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        time_from = attrs.get("time_from")
        time_to = attrs.get("time_to")
        if (time_from is None) != (time_to is None):
            raise serializers.ValidationError(
                {"time_from": "time_from and time_to must be provided together."}
            )
        if time_from is not None and time_from >= time_to:
            raise serializers.ValidationError({"time_to": "time_to must be after time_from."})
        return attrs


class SessionListQuerySerializer(SessionFilterQuerySerializer):
    ordering = serializers.ChoiceField(choices=SESSION_ORDERING_CHOICES, required=False)


class SessionStatsQuerySerializer(SessionFilterQuerySerializer):
    group_by = serializers.ChoiceField(choices=["date", "hour", "weekday", "toy"])
    metrics = serializers.CharField(
        help_text=(
            "Comma-separated metrics: 'count' or '<func>:<field>' with func in "
            "min|max|avg|sum|first|last and field in insertable_length|circumference|duration."
        )
    )

    def validate_metrics(self, value):
        parsed = []
        seen = set()
        for raw in value.split(","):
            token = raw.strip()
            if not token:
                continue
            if token in seen:
                continue
            seen.add(token)
            parsed.append((token, *self._split_metric(token)))
        if not parsed:
            raise serializers.ValidationError("At least one metric is required.")
        return parsed

    def _split_metric(self, token):
        if token == "count":
            return "count", None
        func, sep, field = token.partition(":")
        if not sep or func not in stats.REDUCERS or field not in stats.FIELD_EXTRACTORS:
            raise serializers.ValidationError(f"Unsupported metric '{token}'.")
        return func, field


class StatsGroupSerializer(serializers.Serializer):
    key = serializers.CharField()
    values = serializers.DictField(child=serializers.FloatField(allow_null=True))


class SessionStatsResponseSerializer(serializers.Serializer):
    groups = StatsGroupSerializer(many=True)


SESSION_MEDIA_KINDS = ["image", "video"]


class SessionMediaItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    kind = serializers.ChoiceField(choices=SESSION_MEDIA_KINDS)
    taken_at = serializers.CharField(allow_null=True)
    thumbnail_url = serializers.CharField()
    full_url = serializers.CharField()
    liked = serializers.BooleanField()


class SessionMediaResponseSerializer(serializers.Serializer):
    configured = serializers.BooleanField()
    items = SessionMediaItemSerializer(many=True)
    share_url = serializers.CharField(allow_null=True)


class MediaStatusSerializer(serializers.Serializer):
    configured = serializers.BooleanField()


class MediaLikeRequestSerializer(serializers.Serializer):
    asset_id = serializers.CharField()
    liked = serializers.BooleanField()


class MediaLikeResponseSerializer(serializers.Serializer):
    liked = serializers.BooleanField()


class AttributeSuggestionSerializer(serializers.Serializer):
    key = serializers.CharField()
    values = serializers.ListField(child=serializers.CharField())


class RefreshMediaResponseSerializer(serializers.Serializer):
    configured = serializers.BooleanField()
    sessions_with_media = serializers.IntegerField()


class ExportEnvelopeSerializer(serializers.Serializer):
    version = serializers.IntegerField()
    exported_at = serializers.CharField()
    toys = serializers.ListField(child=serializers.DictField())


class ImportSummarySerializer(serializers.Serializer):
    toys_created = serializers.IntegerField()
    sessions_created = serializers.IntegerField()


class DeleteCollectionSummarySerializer(serializers.Serializer):
    toys_deleted = serializers.IntegerField()
    sessions_deleted = serializers.IntegerField()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        try:
            validate_password(value, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
