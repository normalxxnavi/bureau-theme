// Archivo de prueba del tema: CUE.
package bureau

import "strings"

#Threat: "low" | "high"

#ObjectOfPower: {
	code:      =~"^OOP-[0-9]{4}$"
	threat:    #Threat | *"low"
	resonance: float & >=0 & <=1000
	label:     strings.ToUpper(code)
}

objects: [Code=string]: #ObjectOfPower & {code: Code}

objects: "OOP-0001": {
	threat:    "high"
	resonance: 12.5
}

dangerous: [for c, o in objects if o.threat == "high" {c}]
