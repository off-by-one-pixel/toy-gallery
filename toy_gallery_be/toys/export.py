"""Export / import of the full toy collection.

Each schema version is a self-contained class that owns both the export
(serialise) and import (deserialise) sides of the protocol. Subclassing
``ExportVersion`` with a ``version`` attribute auto-registers the class,
so adding a new version is just dropping another class in this file.
"""

from __future__ import annotations

from typing import ClassVar, Iterable

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers as drf_serializers

from . import models
from .serializers import ToySerializer

_REGISTRY: dict[int, type["ExportVersion"]] = {}


class ExportVersion:
    """Base class for versioned export/import handlers."""

    version: ClassVar[int]

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if getattr(cls, "version", None) is None:
            return
        if cls.version in _REGISTRY:
            raise RuntimeError(f"Duplicate export version registered: {cls.version}")
        _REGISTRY[cls.version] = cls

    @classmethod
    def export(cls, toys: Iterable[models.Toy]) -> dict:
        raise NotImplementedError

    @classmethod
    def import_(cls, payload: dict) -> int:
        raise NotImplementedError


class ExportV1(ExportVersion):
    version = 1

    @classmethod
    def export(cls, toys: Iterable[models.Toy]) -> dict:
        return {
            "version": cls.version,
            "exported_at": timezone.now().isoformat(),
            "toys": [cls._toy_to_portable(t) for t in toys],
        }

    @classmethod
    def import_(cls, payload: dict) -> int:
        toys = payload.get("toys")
        if not isinstance(toys, list):
            raise drf_serializers.ValidationError("Expected a 'toys' array.")
        with transaction.atomic():
            created = 0
            for item in toys:
                s = ToySerializer(data=item)
                s.is_valid(raise_exception=True)
                s.save()
                created += 1
        return created

    @staticmethod
    def _toy_to_portable(toy: models.Toy) -> dict:
        return {
            "brand": toy.brand,
            "name": toy.name,
            "size": toy.size,
            "color": toy.color,
            "insertable_length": toy.insertable_length,
            "custom_attributes": toy.custom_attributes,
            "shape": {
                "top_section_shape": toy.shape.top_section_shape,
                "bottom_section_shape": toy.shape.bottom_section_shape,
                "sections": [
                    {
                        "order": s.order,
                        "height": s.height,
                        "diameter": s.diameter,
                        "circumference": s.circumference,
                    }
                    for s in toy.shape.sections.order_by("order")
                ],
            },
        }


def latest() -> type[ExportVersion]:
    return _REGISTRY[max(_REGISTRY)]


def for_version(v) -> type[ExportVersion]:
    if not isinstance(v, int) or v not in _REGISTRY:
        raise drf_serializers.ValidationError(
            f"Unsupported export version: {v!r}. Known versions: {sorted(_REGISTRY)}."
        )
    return _REGISTRY[v]
