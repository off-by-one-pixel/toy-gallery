from rest_framework import serializers

from . import models
from .dimensions import Dimensions


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
        ]

    def get_diameter(self, obj) -> float:
        return Dimensions.toy_diameter(obj)

    def get_height(self, obj) -> float:
        return Dimensions.toy_height(obj)

    def get_circumference(self, obj) -> float | None:
        return Dimensions.toy_circumference(obj)

    def create(self, validated_data):
        shape_data = validated_data.pop("shape")
        shape_serializer = self.fields["shape"]
        shape_serializer.initial_data = shape_data
        shape_serializer.is_valid()
        shape = shape_serializer.save()
        return models.Toy.objects.create(**validated_data, shape=shape)


class ExportEnvelopeSerializer(serializers.Serializer):
    version = serializers.IntegerField()
    exported_at = serializers.CharField()
    toys = serializers.ListField(child=serializers.DictField())


class ImportSummarySerializer(serializers.Serializer):
    created = serializers.IntegerField()
