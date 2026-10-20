# Archivo de prueba del tema: Mojo.
from collections import List

alias MAX_RESONANCE: Float64 = 1000.0


@value
struct ObjectOfPower:
    """Un Objeto de Poder registrado."""

    var code: String
    var threat: Int
    var resonance: Float64

    fn contain(inout self) raises -> Bool:
        if self.resonance > MAX_RESONANCE:
            raise Error("Brecha en " + self.code)
        self.resonance = 0
        return True


fn main() raises:
    var items = List[ObjectOfPower]()
    for n in range(1, 4):
        items.append(ObjectOfPower("OOP-000" + str(n), n * 2, 0.5))
    for item in items:
        if item[].threat > 2:
            print(item[].code, item[].contain())
