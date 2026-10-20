⍝ Archivo de prueba del tema: APL.
MaxResonance←1000

⍝ Devuelve los objetos que superan el umbral.
∇ r←Dangerous items
  r←(items[;2]>2)⌿items
∇

items←3 2⍴'OOP-0001' 7 'OOP-0002' 1 'AI-0042' 3
codes←Dangerous items
⎕←'Total: ',⍕≢codes
{⍵>MaxResonance:'brecha' ⋄ 'contenido'}12.5
