-- Archivo de prueba del tema: Lean 4.
namespace Bureau

/-- Nivel de amenaza de un Objeto de Poder. -/
inductive Threat where
  | low
  | high
  deriving Repr, DecidableEq

structure ObjectOfPower where
  code : String
  threat : Threat := .low
  resonance : Float := 0.0
  deriving Repr

def maxResonance : Float := 1000.0

def contain (item : ObjectOfPower) : Except String ObjectOfPower :=
  if item.resonance > maxResonance then
    .error s!"Brecha en {item.code}"
  else
    .ok { item with resonance := 0.0 }

theorem threat_cases (t : Threat) : t = .low ∨ t = .high := by
  cases t <;> simp

#eval contain { code := "OOP-0001", threat := .high, resonance := 12.5 }

end Bureau
