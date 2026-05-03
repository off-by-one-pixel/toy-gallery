from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
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
            raise serializers.ValidationError(list(exc.messages))
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
