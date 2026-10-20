// Archivo de prueba del tema: WGSL (WebGPU).
struct Frame {
  time: f32,
  hiss: f32,
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var concrete: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;

const ASTRAL_WHITE = vec3<f32>(0.98, 0.98, 0.96);

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4<f32> {
  var color = textureSample(concrete, linear, input.uv).rgb;
  let pulse = clamp(sin(frame.time * 3.0) * 0.5 + 0.5, 0.0, 1.0);
  if (frame.hiss > 0.1) {
    color = mix(color, vec3<f32>(0.88, 0.21, 0.17), pulse * frame.hiss);
  }
  return vec4<f32>(mix(color, ASTRAL_WHITE, 0.05), 1.0);
}
