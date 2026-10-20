;; Archivo de prueba del tema: Scheme.
(define max-resonance 1000.0)

(define-record-type object-of-power
  (make-object code threat resonance)
  object-of-power?
  (code object-code)
  (threat object-threat)
  (resonance object-resonance))

;; Devuelve #t si el objeto se puede contener.
(define (contain? item)
  (cond ((> (object-resonance item) max-resonance) #f)
        ((eq? (object-threat item) 'high) #t)
        (else #t)))

(let loop ((n 1))
  (when (<= n 3)
    (display (string-append "OOP-000" (number->string n)))
    (newline)
    (loop (+ n 1))))

(contain? (make-object "OOP-0001" 'high 12.5))
