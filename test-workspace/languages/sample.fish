# Archivo de prueba del tema: fish.
set -gx SECTOR research
set -l max_resonance 1000

# Contiene un Objeto de Poder.
function contain --argument-names code resonance
    if test $resonance -gt 1000
        echo "Brecha en $code" >&2
        return 1
    else if test -z "$code"
        return 2
    end
    echo (string upper $code)": contenido"
end

for n in (seq 1 3)
    contain "OOP-000$n" (math "$n * 2")
end

switch $SECTOR
    case research
        echo "Investigación"
    case '*'
        echo "Otro sector"
end
