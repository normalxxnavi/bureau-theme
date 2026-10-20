; Archivo de prueba del tema: LLVM IR.
@code = private unnamed_addr constant [9 x i8] c"OOP-0001\00", align 1

declare i32 @puts(ptr nocapture) nounwind

; Devuelve 1 si la resonancia supera el máximo.
define i32 @breach(double %resonance) {
entry:
  %cmp = fcmp ogt double %resonance, 1.000000e+03
  br i1 %cmp, label %breach, label %sealed

breach:
  %call = call i32 @puts(ptr @code)
  ret i32 1

sealed:
  ret i32 0
}
