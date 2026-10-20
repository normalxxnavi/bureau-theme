#lang racket
;; Archivo de prueba del tema: Racket.
(provide contain dangerous)

(define max-resonance 1000.0)

(struct object-of-power (code threat [resonance #:mutable]) #:transparent)

;; Contiene el objeto o lanza una brecha.
(define (contain item)
  (if (> (object-of-power-resonance item) max-resonance)
      (raise-user-error 'contain "Brecha en ~a" (object-of-power-code item))
      (set-object-of-power-resonance! item 0.0)))

(define (dangerous items)
  (for/list ([i items] #:when (eq? (object-of-power-threat i) 'high))
    (object-of-power-code i)))

(define items
  (for/list ([n (in-range 1 4)])
    (object-of-power (format "OOP-~a" n) (if (> n 1) 'high 'low) 0.5)))

(displayln (dangerous items))
(match (first items)
  [(object-of-power code _ _) (printf "~a\n" code)])
