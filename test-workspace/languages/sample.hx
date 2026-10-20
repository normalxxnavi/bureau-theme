// Archivo de prueba del tema: Haxe.
package fbc.research;

import haxe.ds.StringMap;

/** Nivel de amenaza de un Objeto de Poder. */
enum abstract Threat(Int) {
    var Low = 1;
    var High = 2;
}

@:keep
class ObjectOfPower {
    public static inline var MAX_RESONANCE = 1000.0;

    public final code:String;
    public var threat(default, null):Threat;
    var resonance:Float = 0.0;

    public function new(code:String, threat:Threat = Low) {
        this.code = code;
        this.threat = threat;
    }

    public function contain():Bool {
        if (resonance > MAX_RESONANCE) throw 'Brecha en $code';
        resonance = 0;
        return true;
    }

    static function main() {
        var registry = new StringMap<ObjectOfPower>();
        for (n in 1...4) registry.set('OOP-000$n', new ObjectOfPower('OOP-000$n', n > 1 ? High : Low));
        trace([for (item in registry) if (item.threat == High) item.code]);
    }
}
