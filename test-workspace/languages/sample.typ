// Archivo de prueba del tema: Typst.
#set page(paper: "a4", margin: 2cm)
#set text(font: "Overpass", lang: "es")

#let board(msg) = text(weight: "bold")[<<#msg>>]
#let threat = 7

= Informe de contención

La *Hotline* mostró una resonancia de $r = 12.5$ durante el _Siseo_.
#board[THE BOARD OBSERVES]

== Datos

#table(
  columns: 2,
  [Código], [Amenaza],
  [OOP-0001], [#threat],
)

#if threat > 5 [
  - Nivel de alerta: *alto*
] else [
  - Nivel de alerta: bajo
]

$ R(t) = sum_(i=1)^n alpha_i e^(-lambda t) $
