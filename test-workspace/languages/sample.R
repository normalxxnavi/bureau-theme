# Archivo de prueba del tema: R.
library(stats)

#' Mide la resonancia de una muestra.
#' @param x vector numérico
resonance <- function(x, threshold = 0.5, ...) {
  if (length(x) == 0L) {
    stop("Muestra vacía")
  }
  value <- mean(x, na.rm = TRUE) * 1e-2
  ifelse(value > threshold, "brecha", "contenido")
}

items <- data.frame(
  code = c("OOP-0001", "OOP-0002", "AI-0042"),
  threat = c(7, 3, 1.5),
  contained = c(TRUE, FALSE, NA),
  stringsAsFactors = FALSE
)

dangerous <- subset(items, threat > 2)
for (i in seq_len(nrow(dangerous))) {
  cat(sprintf("%s: %s\n", dangerous$code[i], resonance(dangerous$threat[i])))
}

sectors <- list(research = -3L, containment = -2L)
result <- vapply(sectors, function(f) f * 2, numeric(1))
print(result %in% c(-6, -4))
