// Archivo de prueba del tema: HLSL (sombreado del Plano Astral).
#define ASTRAL_WHITE float3(0.98, 0.98, 0.96)

cbuffer Frame : register(b0)
{
    float4x4 viewProjection;
    float time;
    float hissIntensity;
};

Texture2D concrete : register(t0);
SamplerState linearSampler : register(s0);

struct VSInput  { float3 position : POSITION; float2 uv : TEXCOORD0; };
struct PSInput  { float4 position : SV_POSITION; float2 uv : TEXCOORD0; };

PSInput VSMain(VSInput input)
{
    PSInput output;
    output.position = mul(float4(input.position, 1.0), viewProjection);
    output.uv = input.uv;
    return output;
}

[earlydepthstencil]
float4 PSMain(PSInput input) : SV_TARGET
{
    float3 color = concrete.Sample(linearSampler, input.uv).rgb;
    float pulse = saturate(sin(time * 3.0) * 0.5 + 0.5);
    if (hissIntensity > 0.1)
        color = lerp(color, float3(0.88, 0.21, 0.17), pulse * hissIntensity);
    return float4(lerp(color, ASTRAL_WHITE, 0.05), 1.0);
}
