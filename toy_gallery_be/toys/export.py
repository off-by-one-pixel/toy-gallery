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
    def import_(cls, payload: dict) -> dict:
        raise NotImplementedError


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


class ExportV1(ExportVersion):
    version = 1

    @classmethod
    def export(cls, toys: Iterable[models.Toy]) -> dict:
        return {
            "version": cls.version,
            "exported_at": timezone.now().isoformat(),
            "toys": [_toy_to_portable(t) for t in toys],
        }

    @classmethod
    def import_(cls, payload: dict) -> dict:
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
        return {"toys_created": created, "sessions_created": 0}


class ExportV2(ExportVersion):
    version = 2

    @classmethod
    def export(cls, toys: Iterable[models.Toy]) -> dict:
        toys = list(toys)
        portable_toys = []
        pk_to_local: dict[int, int] = {}
        for local_id, toy in enumerate(toys):
            entry = _toy_to_portable(toy)
            entry["_id"] = local_id
            portable_toys.append(entry)
            pk_to_local[toy.pk] = local_id

        sessions = []
        session_qs = models.Session.objects.prefetch_related("entries__toy").order_by(
            "started_at"
        )
        for session in session_qs:
            entries = []
            skip_session = False
            for entry in session.entries.all():
                local = pk_to_local.get(entry.toy_id)
                if local is None:
                    # Session references a toy outside the export set; skip the
                    # whole session rather than emit a dangling reference.
                    skip_session = True
                    break
                entries.append(
                    {"toy_id": local, "involvement": entry.involvement}
                )
            if skip_session or not entries:
                continue
            sessions.append(
                {
                    "started_at": session.started_at.isoformat(),
                    "entries": entries,
                }
            )

        return {
            "version": cls.version,
            "exported_at": timezone.now().isoformat(),
            "toys": portable_toys,
            "sessions": sessions,
        }

    @classmethod
    def import_(cls, payload: dict) -> dict:
        toys = payload.get("toys")
        if not isinstance(toys, list):
            raise drf_serializers.ValidationError("Expected a 'toys' array.")
        sessions = payload.get("sessions", [])
        if not isinstance(sessions, list):
            raise drf_serializers.ValidationError("Expected a 'sessions' array.")

        with transaction.atomic():
            id_map: dict[int, int] = {}
            toys_created = 0
            for item in toys:
                local_id = item.get("_id")
                if not isinstance(local_id, int):
                    raise drf_serializers.ValidationError(
                        "Each v2 toy must have an integer '_id'."
                    )
                payload_for_toy = {k: v for k, v in item.items() if k != "_id"}
                s = ToySerializer(data=payload_for_toy)
                s.is_valid(raise_exception=True)
                toy = s.save()
                id_map[local_id] = toy.pk
                toys_created += 1

            sessions_created = 0
            for session in sessions:
                started_at = session.get("started_at")
                entries = session.get("entries")
                if not started_at or not isinstance(entries, list) or not entries:
                    raise drf_serializers.ValidationError(
                        "Each session must have 'started_at' and a non-empty 'entries' array."
                    )
                resolved_entries = []
                for entry in entries:
                    local = entry.get("toy_id")
                    if local not in id_map:
                        raise drf_serializers.ValidationError(
                            f"Session entry references unknown toy_id {local!r}."
                        )
                    resolved_entries.append(
                        models.ToySessionEntry(
                            toy_id=id_map[local],
                            involvement=entry.get("involvement"),
                        )
                    )
                new_session = models.Session.objects.create(started_at=started_at)
                for e in resolved_entries:
                    e.session = new_session
                models.ToySessionEntry.objects.bulk_create(resolved_entries)
                sessions_created += 1

        return {"toys_created": toys_created, "sessions_created": sessions_created}


def latest() -> type[ExportVersion]:
    return _REGISTRY[max(_REGISTRY)]


def for_version(v) -> type[ExportVersion]:
    if not isinstance(v, int) or v not in _REGISTRY:
        raise drf_serializers.ValidationError(
            f"Unsupported export version: {v!r}. Known versions: {sorted(_REGISTRY)}."
        )
    return _REGISTRY[v]
