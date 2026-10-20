// Archivo de prueba del tema: V.
module main

import strings

const max_resonance = 1000.0

// Nivel de amenaza de un Objeto de Poder.
enum Threat {
	low = 1
	high
}

struct ObjectOfPower {
	code string
mut:
	threat    Threat = .low
	resonance f64
}

fn (mut o ObjectOfPower) contain() !bool {
	if o.resonance > max_resonance {
		return error('Brecha en ${o.code}')
	}
	o.resonance = 0
	return true
}

fn main() {
	mut items := []ObjectOfPower{}
	for n in 1 .. 4 {
		items << ObjectOfPower{
			code: 'OOP-000${n}'
			threat: if n > 1 { .high } else { .low }
		}
	}
	mut sb := strings.new_builder(64)
	for mut item in items {
		ok := item.contain() or { false }
		sb.write_string('${item.code}: ${ok}\n')
	}
	println(sb.str())
}
