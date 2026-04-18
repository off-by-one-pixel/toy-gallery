"""Single source of truth for toy / section dimensional logic.

Every derived metric (length, diameter, circumference) and every unit
conversion (mm <-> in) lives here so callers don't sprinkle the logic across
models and serializers.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Dict, Optional

if TYPE_CHECKING:
    from . import models


INCH_MM: float = 25.4


class Dimensions:
    """Namespace for dimensional operations. All methods are pure."""

    # ---------- mm <-> in conversion ----------

    @staticmethod
    def mm_to_inches(mm: float) -> float:
        return mm / INCH_MM

    @staticmethod
    def to_dual(mm: Optional[float]) -> Optional[Dict[str, float]]:
        """Convert a stored mm value to the public {mm, in} pair."""
        if mm is None:
            return None
        value = float(mm)
        return {"mm": round(value, 3), "in": round(value / INCH_MM, 3)}

    # ---------- aggregates on a Shape ----------

    @staticmethod
    def shape_height(shape: "models.Shape") -> float:
        return sum(s.height for s in shape.sections.all())

    @staticmethod
    def shape_diameter(shape: "models.Shape") -> float:
        sections = list(shape.sections.all())
        if not sections:
            return 0.0
        return max(s.diameter for s in sections)

    @staticmethod
    def shape_circumference(shape: "models.Shape") -> Optional[float]:
        values = [s.circumference for s in shape.sections.all() if s.circumference is not None]
        return max(values) if values else None

    # ---------- aggregates on a Toy ----------

    @classmethod
    def toy_height(cls, toy: "models.Toy") -> float:
        return cls.shape_height(toy.shape)

    @classmethod
    def toy_diameter(cls, toy: "models.Toy") -> float:
        return cls.shape_diameter(toy.shape)

    @classmethod
    def toy_circumference(cls, toy: "models.Toy") -> Optional[float]:
        return cls.shape_circumference(toy.shape)
