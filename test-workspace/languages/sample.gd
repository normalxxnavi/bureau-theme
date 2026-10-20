# Archivo de prueba del tema: GDScript (Godot).
class_name ObjectOfPower
extends Node

## Un Objeto de Poder registrado.
signal breached(code: String)

enum Threat { LOW = 1, HIGH = 2 }

const MAX_RESONANCE := 1000.0

@export var code: String = "OOP-0000"
@export var threat: Threat = Threat.LOW
var resonance: float = 0.0

func _ready() -> void:
	set_process(threat == Threat.HIGH)

func _process(delta: float) -> void:
	resonance += delta * 2.5
	if resonance > MAX_RESONANCE:
		breached.emit(code)
	elif resonance < 0:
		return

func contain() -> bool:
	resonance = 0.0
	print("%s contenido" % code)
	return true
