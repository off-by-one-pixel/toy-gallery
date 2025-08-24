from rest_framework import serializers

from . import models


class ToyShapeSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ShapeSection
        fields = ["order", "height", "diameter"]


class ToyShapeSerializer(serializers.ModelSerializer):
    sections = ToyShapeSectionSerializer(many=True)

    class Meta:
        model = models.Shape
        fields = ["sections", "top_section_shape"]

    def create(self, validated_data):
        sections_data = validated_data.pop("sections")
        shape = models.Shape.objects.create(**validated_data)
        for s in sections_data:
            models.ShapeSection.objects.create(**s, shape=shape)
        return shape


class ToySerializer(serializers.ModelSerializer):
    shape = ToyShapeSerializer()

    class Meta:
        model = models.Toy
        fields = ["name", "shape"]

    def create(self, validated_data):
        shape_data = validated_data.pop("shape")
        shape_serializer = self.fields["shape"]
        shape_serializer.initial_data = shape_data
        shape_serializer.is_valid()
        shape = shape_serializer.save()
        return models.Toy.objects.create(**validated_data, shape=shape)
