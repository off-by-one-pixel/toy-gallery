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
    # Side-wall control-point angle in degrees (from screen-down, mirrored
    # at left/right anchors). Defaults reproduce the legacy smooth-S
    # taper: top points the CP straight down, bottom straight up — both
    # into the section interior.
    CURVE_ANGLE_CHOICES = [(0, "0°"), (45, "45°"), (90, "90°"), (135, "135°"), (180, "180°")]

    shape = models.ForeignKey(Shape, on_delete=models.CASCADE, related_name="sections")
    diameter = models.FloatField()
    height = models.FloatField()
    order = models.IntegerField()
    circumference = models.FloatField(null=True, blank=True)
    top_curve_angle = models.IntegerField(choices=CURVE_ANGLE_CHOICES, default=0)
    bottom_curve_angle = models.IntegerField(choices=CURVE_ANGLE_CHOICES, default=180)


class Toy(models.Model):
    brand = models.CharField(max_length=255)
    size = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    date_purchased = models.DateField(null=True, blank=True)
    retired = models.BooleanField(default=False)
    shape = models.OneToOneField(Shape, on_delete=models.CASCADE)
    color = models.CharField(max_length=50, null=True, blank=True)
    insertable_length = models.FloatField(null=True, blank=True)
    total_length = models.FloatField(null=True, blank=True)
    circumference = models.FloatField(null=True, blank=True)
    custom_attributes = models.JSONField(default=dict, blank=True)


class Session(models.Model):
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    has_media = models.BooleanField(default=False)

    if TYPE_CHECKING:
        # Reverse relation from ToySessionEntry.session (related_name="entries").
        entries: "RelatedManager[ToySessionEntry]"


class ToySessionEntry(models.Model):
    USED = "USED"
    INSERTED = "INSERTED"
    FULLY_INSERTED = "FULLY_INSERTED"

    INVOLVEMENT_CHOICES = [
        (USED, "Used"),
        (INSERTED, "Inserted"),
        (FULLY_INSERTED, "Fully inserted"),
    ]

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="entries")
    toy = models.ForeignKey(Toy, on_delete=models.PROTECT)
    involvement = models.CharField(max_length=20, choices=INVOLVEMENT_CHOICES)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session", "toy"], name="unique_toy_per_session"
            )
        ]
