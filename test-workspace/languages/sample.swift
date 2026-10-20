// Archivo de prueba del tema: Swift.
import Foundation

/// Nivel de amenaza de un Objeto de Poder.
enum Threat: Int, CaseIterable {
    case low = 1, high
}

protocol Containable {
    mutating func contain() throws
}

struct ContainmentError: Error {
    let code: String
}

@MainActor
final class FieldAgent {
    let name: String
    private(set) var clearance: Int = 1
    lazy var badge: String = "\(name) — level \(clearance)"

    init(name: String) { self.name = name }

    func promote(by levels: Int = 1) async -> Int {
        guard levels > 0 else { return clearance }
        clearance += levels
        return clearance
    }
}

struct ObjectOfPower: Containable {
    var code: String
    var resonance: Double = 0.0

    mutating func contain() throws {
        if resonance > 1_000.0 { throw ContainmentError(code: code) }
        resonance = 0
    }
}

let threats = Threat.allCases.map { $0.rawValue }.filter { $0 >= 1 }
var item = ObjectOfPower(code: "OOP-0001", resonance: 3.5e2)
do {
    try item.contain()
    print("Contained \(item.code) \(threats)")
} catch let error as ContainmentError {
    print("Breach: \(error.code)")
}
