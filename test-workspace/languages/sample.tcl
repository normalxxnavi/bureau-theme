# Archivo de prueba del tema: Tcl.
package require Tcl 8.6

set maxResonance 1000.0
array set threats {OOP-0001 high OOP-0002 low}

# Devuelve 1 si el objeto se puede contener.
proc contain {code resonance} {
    global maxResonance
    if {$resonance > $maxResonance} {
        error "Brecha en $code"
    } elseif {$resonance < 0} {
        return 0
    }
    return 1
}

foreach code [array names threats] {
    if {$threats($code) eq "high"} {
        puts [format "%s: %d" $code [contain $code 12.5]]
    }
}

set items [list "OOP-0001" "AI-0042"]
puts "Total: [llength $items]"
