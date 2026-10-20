(* Archivo de prueba del tema: Wolfram Language. *)
maxResonance = 1000.;

(* Contiene un Objeto de Poder si su resonancia lo permite. *)
contain[item_Association] := If[item["resonance"] > maxResonance,
  Failure["Breach", <|"Message" -> "Brecha en " <> item["code"]|>],
  Append[item, "resonance" -> 0.]
]

items = Table[<|"code" -> "OOP-000" <> ToString[n], "threat" -> 2 n, "resonance" -> 0.5|>, {n, 3}];
dangerous = Select[items, #threat > 2 &];
Map[contain, dangerous] // Length
Plot[Sin[x] Exp[-x/5], {x, 0, 10}, PlotStyle -> Red]
