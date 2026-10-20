// Archivo de prueba del tema: D.
module bureau.registry;

import std.stdio;
import std.algorithm : filter, map;
import std.format : format;

/// Nivel de amenaza de un Objeto de Poder.
enum Threat { low = 1, high = 2 }

struct ObjectOfPower
{
    string code;
    Threat threat = Threat.low;
    double resonance = 0.0;

    enum maxResonance = 1e3;

    bool contain() @safe
    {
        if (resonance > maxResonance)
            throw new Exception(format!"Brecha en %s"(code));
        resonance = 0;
        return true;
    }
}

void main()
{
    auto items = [ObjectOfPower("OOP-0001", Threat.high, 12.5), ObjectOfPower("AI-0042")];
    foreach (ref item; items.filter!(i => i.threat == Threat.high))
        writefln("%s: %s", item.code, item.contain());
    writeln('J', " ", items.length);
}
