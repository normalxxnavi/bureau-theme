# Archivo de prueba del tema: Nushell.
const MAX_RESONANCE = 1000

# Contiene un Objeto de Poder.
def contain [code: string, resonance: float = 0.0] {
    if $resonance > $MAX_RESONANCE {
        error make { msg: $"Brecha en ($code)" }
    }
    { code: $code, status: "contenido" }
}

let items = [[code threat]; ["OOP-0001" 7] ["AI-0042" 1]]
$items
| where threat > 2
| each { |item| contain $item.code 12.5 }
| table

mut total = 0
for n in 1..3 { $total += $n }
print $"Total: ($total)"
