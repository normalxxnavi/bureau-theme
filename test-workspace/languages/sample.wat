;; Archivo de prueba del tema: WebAssembly (formato de texto).
(module
  (import "bureau" "log" (func $log (param i32)))
  (memory (export "memory") 1)
  (global $maxResonance f64 (f64.const 1000.0))
  (data (i32.const 0) "OOP-0001")

  ;; Devuelve 1 si la resonancia supera el máximo.
  (func $breach (export "breach") (param $resonance f64) (result i32)
    (f64.gt (local.get $resonance) (global.get $maxResonance)))

  (func $count (export "count") (param $n i32) (result i32)
    (local $i i32)
    (block $done
      (loop $next
        (br_if $done (i32.ge_s (local.get $i) (local.get $n)))
        (call $log (local.get $i))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $next)))
    (local.get $i))
)
