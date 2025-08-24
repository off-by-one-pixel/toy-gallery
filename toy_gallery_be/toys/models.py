from django.db import models


class Shape(models.Model):
    EGG = "EGG"
    CONE = "CONE"

    TOP_SHAPE_CHOICES = [
        (EGG, "Egg"),
        (CONE, "Cone"),
    ]

    top_section_shape = models.CharField(
        choices=TOP_SHAPE_CHOICES,
        default=EGG,
    )


class ShapeSection(models.Model):
    shape = models.ForeignKey(Shape, on_delete=models.CASCADE, related_name="sections")
    diameter = models.FloatField()
    height = models.FloatField()
    order = models.IntegerField()


class Toy(models.Model):
    name = models.CharField()
    shape = models.OneToOneField(
        Shape,
        on_delete=models.CASCADE,
        primary_key=True,
    )
