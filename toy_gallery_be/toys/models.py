from typing import TYPE_CHECKING

from django.db import models

if TYPE_CHECKING:
    from django.db.models.manager import RelatedManager


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

    if TYPE_CHECKING:
        # Reverse relation from ShapeSection.shape (related_name="sections").
        sections: "RelatedManager[ShapeSection]"


class ShapeSection(models.Model):
    shape = models.ForeignKey(Shape, on_delete=models.CASCADE, related_name="sections")
    diameter = models.FloatField()
    height = models.FloatField()
    order = models.IntegerField()
    circumference = models.FloatField(null=True, blank=True)


class Toy(models.Model):
    brand = models.CharField()
    size = models.CharField()
    name = models.CharField()
    date_purchased = models.DateField(null=True, blank=True)
    retired = models.BooleanField(default=False)
    shape = models.OneToOneField(Shape, on_delete=models.CASCADE)
    color = models.CharField(null=True, blank=True)
    insertable_length = models.FloatField(null=True, blank=True)
