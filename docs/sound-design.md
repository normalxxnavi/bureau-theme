# Diseño de sonido

> Archivo generado por `npm run sounds` a partir de `scripts/sounds/generate.js`. No lo edites a mano.

Todos los sonidos son **recreaciones originales** sintetizadas con código (osciladores, ruido, filtros,
envolventes, reverb y eco). No contienen audio, música ni voces de *Control* ni de *Control Resonant*.

Reglas de diseño (plan, sección 5.5):

- La parte audible dura menos de 1,5 s (el arranque, unos 3 s); el resto es una cola de reverb que se apaga.
- Ataque suave, sin clics al empezar ni cortes al terminar (fundido final y recorte por debajo de −50 dBFS).
- Pico normalizado por sonido: −4/−6 dBFS los importantes, −8/−12 dBFS los frecuentes (guardar, breakpoint, terminal).
- Formato: WAV PCM 16 bits, mono, 32 kHz (lo entienden los reproductores de Windows, macOS y Linux).

## Pack Control — The Oldest House

Analógico e institucional: timbres, teléfonos, máquinas de escribir, alarmas y la reverb de una sala de hormigón.

| Evento | Archivo | Sonido | Duración | Pico |
|---|---|---|---|---|
| Arranque de VS Code | `startup.wav` | Zumbido grave de la Oldest House: un drone de hormigón que respira, con una resonancia lejana. | 4.11 s | -1.0 dB |
| Activar un tema CONTROL | `theme.wav` | La Hotline: el timbre de un teléfono antiguo (dos campanillas golpeadas por un badajo) en una sala de hormigón. | 1.56 s | -1.0 dB |
| Guardar (manual) | `save.wav` | Sello de archivo: un golpe seco de goma sobre papel. Muy discreto. | 0.17 s | -1.0 dB |
| Errores nuevos | `error.wav` | Susurro del Siseo (el Hiss): murmullos de ruido filtrado y un tono grave disonante (segunda menor) que crece. | 2.34 s | -1.0 dB |
| Todos los errores corregidos | `clear.wav` | Control Point purificado: un barrido de aire que sube y un acorde mayor que se abre, con una campanilla. | 2.56 s | -1.0 dB |
| Tarea terminada con éxito | `build-ok.wav` | Campana de ascensor: dos notas ascendentes (sol–do), limpias y breves. | 1.95 s | -1.0 dB |
| Tarea fallida | `build-fail.wav` | Alerta del Bureau: dos toques graves de sirena filtrada que resuenan en un pasillo de hormigón. | 2.29 s | -1.0 dB |
| Comando de terminal fallido | `terminal-fail.wav` | Estática de radio: un chasquido de interferencias con un pitido apagado. | 0.56 s | -1.0 dB |
| Inicio de depuración | `debug.wav` | Transformación del Service Weapon: un trinquete mecánico que acelera, energía que sube y un cierre metálico. | 1.49 s | -1.0 dB |
| Breakpoint alcanzado | `breakpoint.wav` | Proyector de diapositivas: «ka-chunk», el carro avanza y la diapositiva cae en su sitio. | 0.74 s | -1.0 dB |
| Commit de Git | `commit.wav` | Máquina de escribir y timbre del carro: tres teclas y la campanilla de fin de línea. | 1.18 s | -1.0 dB |
| Escribir en el editor | `typing.wav` | Tecla de la máquina de escribir de la Agencia: clic metálico y golpe seco del tipo contra el rodillo (variante 1). | 0.08 s | -1.0 dB |
| Escribir en el editor | `typing-2.wav` | Tecla de la máquina de escribir de la Agencia: clic metálico y golpe seco del tipo contra el rodillo (variante 2). | 0.08 s | -1.0 dB |
| Escribir en el editor | `typing-3.wav` | Tecla de la máquina de escribir de la Agencia: clic metálico y golpe seco del tipo contra el rodillo (variante 3). | 0.08 s | -1.0 dB |

## Pack Resonant — Patterned Manhattan

Sintético y «cósmico»: tonos de cristal (FM), caídas de tono por gravedad y ecos que se repiten (el *Patterning*).

| Evento | Archivo | Sonido | Duración | Pico |
|---|---|---|---|---|
| Arranque de VS Code | `startup.wav` | Manhattan a lo lejos, deformado: rumor de ciudad, un acorde que se hunde por la gravedad y un motivo de cristal que se repite. | 4.38 s | -1.0 dB |
| Activar un tema CONTROL | `theme.wav` | Pulso de la Hedron: dos tonos de cristal puros que se repiten tres veces, cada vez más lejos. | 2.29 s | -1.0 dB |
| Guardar (manual) | `save.wav` | Clic metálico: un «tic» sintético y breve. Muy discreto. | 0.08 s | -1.0 dB |
| Errores nuevos | `error.wav` | El Siseo invade la ciudad: un susurro que se repite en ecos cada vez más graves y un tono distorsionado. | 2.20 s | -1.0 dB |
| Todos los errores corregidos | `clear.wav` | Resonant derrotado: un impacto profundo, un acorde que se eleva y un brillo que se desvanece. | 2.72 s | -1.0 dB |
| Tarea terminada con éxito | `build-ok.wav` | Arpegio ascendente de cristal (mi–sol#–si) con un eco que lo repite más lejos. | 2.30 s | -1.0 dB |
| Tarea fallida | `build-fail.wav` | Distorsión gravitatoria: un tono que se desploma dos octavas mientras se rompe digitalmente, con un golpe sub. | 1.87 s | -1.0 dB |
| Comando de terminal fallido | `terminal-fail.wav` | Estática con «glitch»: un fragmento de interferencia que se repite cuatro veces, como un patrón atascado. | 0.48 s | -1.0 dB |
| Inicio de depuración | `debug.wav` | El Aberrant cambia de forma: tres transformaciones sintéticas que suben de tono, cada una con su clic, y un cierre. | 1.74 s | -1.0 dB |
| Breakpoint alcanzado | `breakpoint.wav` | Shift: un desplazamiento rápido que cae y vuelve a subir, como cambiar de gravedad. | 1.10 s | -1.0 dB |
| Commit de Git | `commit.wav` | Golpe metálico con eco: una pieza de hierro golpeada cuyo sonido se repite en patrón. | 1.61 s | -1.0 dB |
| Escribir en el editor | `typing.wav` | Tic de resonancia: un golpe de cristal muy corto, como una tecla en el Manhattan alterado (variante 1). | 0.12 s | -2.7 dB |
| Escribir en el editor | `typing-2.wav` | Tic de resonancia: un golpe de cristal muy corto, como una tecla en el Manhattan alterado (variante 2). | 0.12 s | -3.0 dB |
| Escribir en el editor | `typing-3.wav` | Tic de resonancia: un golpe de cristal muy corto, como una tecla en el Manhattan alterado (variante 3). | 0.12 s | -2.2 dB |

## Cambiar o añadir sonidos

1. Edita la receta en `scripts/sounds/generate.js` (las piezas reutilizables están arriba: `bell`, `click`, `thump`, `whisper`, `whoosh`, `glass`).
2. Ejecuta `npm run sounds` y escúchalos con el comando **CONTROL: Probar sonidos** (F5 → ventana de pruebas).
3. Para usar archivos propios sin tocar el código: ajuste `bureauTheme.sounds.customFolder`.
