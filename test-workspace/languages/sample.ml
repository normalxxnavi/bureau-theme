(* Archivo de prueba del tema: OCaml. *)
open Printf

(** Nivel de amenaza de un Objeto de Poder. *)
type threat = Low | High

type object_of_power = {
  code : string;
  threat : threat;
  mutable resonance : float;
}

exception Breach of string

let max_resonance = 1.0e3

let contain item =
  if item.resonance > max_resonance then raise (Breach item.code)
  else item.resonance <- 0.0

module Registry = struct
  let dangerous items = List.filter (fun i -> i.threat = High) items
end

let () =
  let items = List.init 3 (fun n -> { code = sprintf "OOP-%04d" (n + 1); threat = (if n > 0 then High else Low); resonance = 0.5 }) in
  List.iter
    (fun i ->
      match contain i with
      | () -> printf "%s: contenido\n" i.code
      | exception Breach c -> eprintf "Brecha en %s\n" c)
    (Registry.dangerous items);
  print_char 'J'
