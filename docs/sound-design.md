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
| Arranque de VS Code | `startup.wav` | Zumbido grave de la Oldest House: un drone de hormigón que respira, con una resonancia lejana. | 3.59 s | -5.0 dB |
| Activar un tema CONTROL | `theme.wav` | La Hotline: el timbre de un teléfono antiguo (dos campanillas golpeadas por un badajo) en una sala de hormigón. | 1.44 s | -6.0 dB |
| Guardar (manual) | `save.wav` | Sello de archivo: un golpe seco de goma sobre papel. Muy discreto. | 0.15 s | -12.0 dB |
| Errores nuevos | `error.wav` | Susurro del Hiss: murmullos de ruido filtrado y un tono grave disonante (segunda menor) que crece. | 2.12 s | -4.0 dB |
| Todos los errores corregidos | `clear.wav` | Control Point purificado: un barrido de aire que sube y un acorde mayor que se abre, con una campanilla. | 2.20 s | -4.0 dB |
| Tarea terminada con éxito | `build-ok.wav` | Campana de ascensor: dos notas ascendentes (sol–do), limpias y breves. | 1.72 s | -5.0 dB |
| Tarea fallida | `build-fail.wav` | Alerta del Bureau: dos toques graves de sirena filtrada que resuenan en un pasillo de hormigón. | 1.96 s | -5.0 dB |
| Comando de terminal fallido | `terminal-fail.wav` | Estática de radio: un chasquido de interferencias con un pitido apagado. | 0.56 s | -8.0 dB |
| Inicio de depuración | `debug.wav` | Transformación del Service Weapon: un trinquete mecánico que acelera, energía que sube y un cierre metálico. | 1.16 s | -4.0 dB |
| Breakpoint alcanzado | `breakpoint.wav` | Proyector de diapositivas: «ka-chunk», el carro avanza y la diapositiva cae en su sitio. | 0.46 s | -10.0 dB |
| Commit de Git | `commit.wav` | Máquina de escribir y timbre del carro: tres teclas y la campanilla de fin de línea. | 1.05 s | -6.0 dB |

## Pack Resonant — Patterned Manhattan

Sintético y «cósmico»: tonos de cristal (FM), caídas de tono por gravedad y ecos que se repiten (el *Patterning*).

| Evento | Archivo | Sonido | Duración | Pico |
|---|---|---|---|---|
| Arranque de VS Code | `startup.wav` | Manhattan a lo lejos, deformado: rumor de ciudad, un acorde que se hunde por la gravedad y un motivo de cristal que se repite. | 4.08 s | -5.0 dB |
| Activar un tema CONTROL | `theme.wav` | Pulso de la Hedron: dos tonos de cristal puros que se repiten tres veces, cada vez más lejos. | 1.97 s | -6.0 dB |
| Guardar (manual) | `save.wav` | Clic metálico: un «tic» sintético y breve. Muy discreto. | 0.06 s | -12.0 dB |
| Errores nuevos | `error.wav` | El Hiss invade la ciudad: un susurro que se repite en ecos cada vez más graves y un tono distorsionado. | 2.17 s | -4.0 dB |
| Todos los errores corregidos | `clear.wav` | Resonant derrotado: un impacto profundo, un acorde que se eleva y un brillo que se desvanece. | 2.21 s | -4.0 dB |
| Tarea terminada con éxito | `build-ok.wav` | Arpegio ascendente de cristal (mi–sol#–si) con un eco que lo repite más lejos. | 1.95 s | -5.0 dB |
| Tarea fallida | `build-fail.wav` | Distorsión gravitatoria: un tono que se desploma dos octavas mientras se rompe digitalmente, con un golpe sub. | 1.62 s | -5.0 dB |
| Comando de terminal fallido | `terminal-fail.wav` | Estática con «glitch»: un fragmento de interferencia que se repite cuatro veces, como un patrón atascado. | 0.48 s | -8.0 dB |
| Inicio de depuración | `debug.wav` | El Aberrant cambia de forma: tres transformaciones sintéticas que suben de tono, cada una con su clic, y un cierre. | 1.64 s | -4.0 dB |
| Breakpoint alcanzado | `breakpoint.wav` | Shift: un desplazamiento rápido que cae y vuelve a subir, como cambiar de gravedad. | 0.85 s | -10.0 dB |
| Commit de Git | `commit.wav` | Golpe metálico con eco: una pieza de hierro golpeada cuyo sonido se repite en patrón. | 1.16 s | -6.0 dB |

## Cambiar o añadir sonidos

1. Edita la receta en `scripts/sounds/generate.js` (las piezas reutilizables están arriba: `bell`, `click`, `thump`, `whisper`, `whoosh`, `glass`).
2. Ejecuta `npm run sounds` y escúchalos con el comando **CONTROL: Probar sonidos** (F5 → ventana de pruebas).
3. Para usar archivos propios sin tocar el código: ajuste `bureauTheme.sounds.customFolder`.
