// Archivo de prueba del tema: Dart.
import 'dart:async';
import 'dart:math' as math;

/// Nivel de amenaza de un Objeto de Poder.
enum Threat { low, high }

abstract class Containable {
  Future<void> contain();
}

class ObjectOfPower implements Containable {
  final String code;
  final Threat threat;
  double _resonance;

  ObjectOfPower(this.code, {this.threat = Threat.low, double resonance = 0.0}) : _resonance = resonance;

  static const maxResonance = 1e3;

  @override
  Future<void> contain() async {
    if (_resonance > maxResonance) {
      throw StateError('Breach in $code: ${_resonance.toStringAsFixed(2)}');
    }
    await Future.delayed(const Duration(milliseconds: 100));
    _resonance = 0;
  }

  String get label => '$code [${threat.name}]';
}

void main() async {
  final items = <ObjectOfPower>[ObjectOfPower('OOP-0001', threat: Threat.high, resonance: 12.5)];
  for (final item in items) {
    await item.contain();
    print('${item.label} ${math.pi}');
  }
  final stream = Stream<int>.periodic(const Duration(seconds: 1), (i) => i).take(3);
  await for (final tick in stream) {
    if (tick.isEven) print('tick $tick');
  }
}
