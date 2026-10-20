// Archivo de prueba del tema: ShaderLab (Unity).
Shader "Bureau/HissGlow"
{
    Properties
    {
        _MainTex ("Concrete", 2D) = "white" {}
        _GlowColor ("Hiss Red", Color) = (0.88, 0.21, 0.17, 1)
        _Intensity ("Intensity", Range(0, 4)) = 1.5
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 200
        Cull Back
        ZWrite On

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _MainTex;
            fixed4 _GlowColor;
            float _Intensity;

            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };

            v2f vert (appdata_base v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.texcoord.xy;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 c = tex2D(_MainTex, i.uv);
                return c + _GlowColor * _Intensity * 0.25;
            }
            ENDCG
        }
    }
    FallBack "Diffuse"
}
