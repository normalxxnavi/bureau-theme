// Archivo de prueba del tema: Gleam.
import gleam/int
import gleam/io
import gleam/list

/// Nivel de amenaza de un Objeto de Poder.
pub type Threat {
  Low
  High
}

pub type ObjectOfPower {
  ObjectOfPower(code: String, threat: Threat, resonance: Float)
}

const max_resonance = 1000.0

pub fn contain(item: ObjectOfPower) -> Result(ObjectOfPower, String) {
  case item.resonance >. max_resonance {
    True -> Error("Brecha en " <> item.code)
    False -> Ok(ObjectOfPower(..item, resonance: 0.0))
  }
}

pub fn main() {
  list.range(1, 3)
  |> list.map(fn(n) { ObjectOfPower("OOP-000" <> int.to_string(n), High, 0.5) })
  |> list.filter(fn(item) { item.threat == High })
  |> list.each(fn(item) {
    let assert Ok(contained) = contain(item)
    io.println(contained.code)
  })
}
