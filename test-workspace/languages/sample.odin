// Archivo de prueba del tema: Odin.
package bureau

import "core:fmt"

MAX_RESONANCE :: 1000.0

// Nivel de amenaza de un Objeto de Poder.
Threat :: enum u8 {
	Low = 1,
	High,
}

Object_Of_Power :: struct {
	code:      string,
	threat:    Threat,
	resonance: f64,
}

contain :: proc(item: ^Object_Of_Power) -> (ok: bool) {
	if item.resonance > MAX_RESONANCE {
		return false
	}
	item.resonance = 0
	return true
}

main :: proc() {
	items := [?]Object_Of_Power{{"OOP-0001", .High, 12.5}, {"AI-0042", .Low, 0}}
	for &item in items {
		switch item.threat {
		case .High:
			fmt.printf("%s: %v\n", item.code, contain(&item))
		case .Low:
			continue
		}
	}
	defer fmt.println("<<THE BOARD OBSERVES.>>")
}
