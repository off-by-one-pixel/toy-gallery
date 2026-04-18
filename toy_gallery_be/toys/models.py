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

    def get_height(self) -> float:
        return sum(section.height for section in self.sections.all())  # type: ignore

    def get_diameter(self) -> float:
        if not self.sections.exists():  # type: ignore
            return 0.0
        return max(section.diameter for section in self.sections.all())  # type: ignore

    def get_circumference(self) -> float | None:
        values = [
            section.circumference
            for section in self.sections.all()  # type: ignore
            if section.circumference is not None
        ]
        return max(values) if values else None


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

    def diameter(self) -> float:
        return self.shape.get_diameter()

    def height(self) -> float:
        return self.shape.get_height()

    def circumference(self) -> float | None:
        return self.shape.get_circumference()
