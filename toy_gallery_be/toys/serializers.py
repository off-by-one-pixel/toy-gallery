from rest_framework import serializers

from . import models
from .dimensions import SessionDimensions, ToyDimensions


class ToyShapeSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ShapeSection
        fields = ["id", "order", "height", "diameter", "circumference"]


class ToyShapeSerializer(serializers.ModelSerializer):
    sections = ToyShapeSectionSerializer(many=True)

    class Meta:
        model = models.Shape
        fields = ["top_section_shape", "bottom_section_shape", "sections"]

    def validate_sections(self, sections):
        if not any(s.get("circumference") is not None for s in sections):
            raise serializers.ValidationError(
                "At least one section must have a circumference."
            )
        return sections

    def create(self, validated_data):
        sections_data = validated_data.pop("sections")
        shape = models.Shape.objects.create(**validated_data)
        for s in sections_data:
            models.ShapeSection.objects.create(**s, shape=shape)
        return shape


class ToySerializer(serializers.ModelSerializer):
    shape = ToyShapeSerializer()
    diameter = serializers.SerializerMethodField()
    height = serializers.SerializerMethodField()
    circumference = serializers.SerializerMethodField()
    custom_attributes = serializers.DictField(
        child=serializers.CharField(allow_blank=True),
        required=False,
    )

    def validate_custom_attributes(self, value):
        """Drop entries with an empty key; trim keys. Empty values are kept."""
        return {k.strip(): v for k, v in value.items() if k.strip()}

    class Meta:
        model = models.Toy
        fields = [
            "id",
            "brand",
            "name",
            "shape",
            "diameter",
            "height",
            "circumference",
            "size",
            "date_purchased",
            "retired",
            "color",
            "insertable_length",
            "custom_attributes",
        ]

    def get_diameter(self, obj) -> float:
        return ToyDimensions.diameter(obj)

    def get_height(self, obj) -> float:
        return ToyDimensions.height(obj)

    def get_circumference(self, obj) -> float | None:
        return ToyDimensions.circumference(obj)

    def create(self, validated_data):
        shape_data = validated_data.pop("shape")
        shape_serializer = self.fields["shape"]
        shape_serializer.initial_data = shape_data
        shape_serializer.is_valid()
        shape = shape_serializer.save()
        return models.Toy.objects.create(**validated_data, shape=shape)


class ToySessionEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ToySessionEntry
        fields = ["toy", "involvement"]


class SessionSerializer(serializers.ModelSerializer):
    entries = ToySessionEntrySerializer(many=True)
    max_insertable_length = serializers.SerializerMethodField()
    max_circumference = serializers.SerializerMethodField()

    class Meta:
        model = models.Session
        fields = ["id", "started_at", "entries", "max_insertable_length", "max_circumference"]

    def get_max_insertable_length(self, obj) -> float | None:
        return SessionDimensions.peak_length(obj)

    def get_max_circumference(self, obj) -> float | None:
        return SessionDimensions.peak_circumference(obj)

    def validate_entries(self, entries):
        if not entries:
            raise serializers.ValidationError("A session must include at least one toy.")
        toy_ids = [e["toy"].pk for e in entries]
        if len(set(toy_ids)) != len(toy_ids):
            raise serializers.ValidationError(
                "Each toy can appear only once per session."
            )
        return entries

    def create(self, validated_data):
        entries_data = validated_data.pop("entries")
        session = models.Session.objects.create(**validated_data)
        models.ToySessionEntry.objects.bulk_create(
            [models.ToySessionEntry(session=session, **e) for e in entries_data]
        )
        return session

    def update(self, instance, validated_data):
        entries_data = validated_data.pop("entries", None)
        instance.started_at = validated_data.get("started_at", instance.started_at)
        instance.save()
        if entries_data is not None:
            instance.entries.all().delete()
            models.ToySessionEntry.objects.bulk_create(
                [models.ToySessionEntry(session=instance, **e) for e in entries_data]
            )
        return instance


class ActivityDaySerializer(serializers.Serializer):
    date = serializers.DateField()
    session_count = serializers.IntegerField()
    max_insertable_length = serializers.FloatField(allow_null=True)
    max_circumference = serializers.FloatField(allow_null=True)


class ActivityResponseSerializer(serializers.Serializer):
    days = ActivityDaySerializer(many=True)


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
