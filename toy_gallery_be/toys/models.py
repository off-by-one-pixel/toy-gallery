from typing import TYPE_CHECKING

from django.db import models

if TYPE_CHECKING:
    from django.db.models.manager import RelatedManager


class Shape(models.Model):
    EGG = "EGG"
    CONE = "CONE"
    SPIKE = "SPIKE"
    FLAT = "FLAT"

    CAP_SHAPE_CHOICES = [
        (FLAT, "Flat"),
        (EGG, "Egg"),
        (CONE, "Cone"),
        (SPIKE, "Spike"),
    ]

    top_section_shape = models.CharField(
        max_length=16,
        choices=CAP_SHAPE_CHOICES,
        default=EGG,
    )
    bottom_section_shape = models.CharField(
        max_length=16,
        choices=CAP_SHAPE_CHOICES,
        default=FLAT,
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
    brand = models.CharField(max_length=255)
    size = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    date_purchased = models.DateField(null=True, blank=True)
    retired = models.BooleanField(default=False)
    shape = models.OneToOneField(Shape, on_delete=models.CASCADE)
    color = models.CharField(max_length=50, null=True, blank=True)
    insertable_length = models.FloatField(null=True, blank=True)
