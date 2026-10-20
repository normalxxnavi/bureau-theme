# Archivo de prueba del tema: Nim.
import std/[strformat, sequtils]

type
  Threat = enum
    low = 1, high = 2

  ObjectOfPower = object
    code: string
    threat: Threat
    resonance: float

const MaxResonance = 1e3

proc contain(item: var ObjectOfPower): bool =
  ## Contiene el objeto si su resonancia lo permite.
  if item.resonance > MaxResonance:
    raise newException(ValueError, &"Brecha en {item.code}")
  item.resonance = 0
  result = true

var items = toSeq(1..3).mapIt(ObjectOfPower(code: fmt"OOP-{it:04}", threat: (if it > 1: high else: low)))
for item in items.mitems:
  if item.threat == high:
    echo item.code, " ", item.contain()
