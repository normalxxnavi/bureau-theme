#!/usr/bin/awk -f
# Archivo de prueba del tema: AWK.
BEGIN {
    FS = ","
    MAX_RESONANCE = 1000
    print "Código,Estado"
}

# Salta la cabecera y las líneas vacías.
NR == 1 || /^$/ { next }

$3 > MAX_RESONANCE {
    breaches[$1]++
    printf "%s,brecha\n", $1
    next
}

{
    total += $2
    print $1 ",contenido"
}

END {
    for (code in breaches) count++
    printf "Total: %d (brechas: %d)\n", total, count
}
