"""Archivo de prueba del tema: Python."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum

PATTERN = re.compile(r"^OOP-(\d{4})-[A-Z]+$")


class Threat(Enum):
    LOW = 1
    HIGH = 2


@dataclass(frozen=True)
class ObjectOfPower:
    code: str
    name: str
    threat: Threat = Threat.LOW
    tags: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return PATTERN.match(self.code) is not None

    def describe(self, *, verbose: bool = False) -> str:
        base = f"{self.name} [{self.code}]"
        return f"{base} — {', '.join(self.tags)}" if verbose and self.tags else base


def scan(objects: list[ObjectOfPower], minimum: Threat = Threat.HIGH) -> list[str]:
    return [o.describe(verbose=True) for o in objects if o.threat.value >= minimum.value]


if __name__ == "__main__":
    print(scan([ObjectOfPower("OOP-0042-PROJECTOR", "Slide Projector", Threat.HIGH, ["visual"])]))
