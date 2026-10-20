// Archivo de prueba del tema: F#.
module Bureau.Research

open System

/// Nivel de amenaza de un Objeto de Poder.
type Threat =
    | Low = 1
    | High = 2

type ObjectOfPower =
    { Code: string
      Threat: Threat
      Resonance: float }

[<Literal>]
let MaxResonance = 1000.0

let contain (item: ObjectOfPower) : Result<ObjectOfPower, string> =
    if item.Resonance > MaxResonance then
        Error(sprintf "Brecha en %s" item.Code)
    else
        Ok { item with Resonance = 0.0 }

[<EntryPoint>]
let main argv =
    let items =
        [ for n in 1..3 ->
              { Code = $"OOP-%04d{n}"
                Threat = if n > 1 then Threat.High else Threat.Low
                Resonance = float n * 1.5e2 } ]

    items
    |> List.filter (fun i -> i.Threat = Threat.High)
    |> List.iter (fun i ->
        match contain i with
        | Ok contained -> printfn "Contenido: %s" contained.Code
        | Error msg -> eprintfn "%s" msg)

    let mutable count = 0
    while count < 3 do
        count <- count + 1
    0
