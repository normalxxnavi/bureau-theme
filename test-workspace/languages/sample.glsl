// Archivo de prueba del tema: GLSL.
#version 330 core
#define ASTRAL_WHITE vec3(0.98, 0.98, 0.96)

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uConcrete;
uniform float uTime;
uniform float uHiss;

/* Pulso rojo del Siseo. */
float pulse(float t) {
    return clamp(sin(t * 3.0) * 0.5 + 0.5, 0.0, 1.0);
}

void main() {
    vec3 color = texture(uConcrete, vUv).rgb;
    if (uHiss > 0.1) {
        color = mix(color, vec3(0.88, 0.21, 0.17), pulse(uTime) * uHiss);
    }
    fragColor = vec4(mix(color, ASTRAL_WHITE, 0.05), 1.0);
}
