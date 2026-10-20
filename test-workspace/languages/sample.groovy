// Archivo de prueba del tema: Groovy.
package gov.fbc

import groovy.transform.CompileStatic
import groovy.transform.ToString

/** Un agente de campo. */
@ToString(includeNames = true)
@CompileStatic
class FieldAgent {
    String name
    int clearance = 1
    static final List<String> SECTORS = ['Research', 'Containment', 'Maintenance']

    String badge() {
        "${name.toUpperCase()} — level $clearance"
    }

    boolean canEnter(String sector) {
        return clearance >= 3 || sector in SECTORS.take(1)
    }
}

def jesse = new FieldAgent(name: 'Jesse Faden', clearance: 7)
def levels = (1..5).collect { it * 2 }.findAll { it > 4 }
def config = [hotline: true, volume: 0.7, codes: /OOP-\d{4}/]

if (jesse.canEnter('Research')) {
    println jesse.badge()
} else {
    throw new IllegalStateException("Access denied: ${jesse.name}")
}
