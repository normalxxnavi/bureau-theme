;;;; Archivo de prueba del tema: Common Lisp.
(defpackage :bureau
  (:use :cl)
  (:export #:contain #:dangerous))
(in-package :bureau)

(defconstant +max-resonance+ 1000.0)

(defclass object-of-power ()
  ((code :initarg :code :accessor code)
   (threat :initarg :threat :initform :low :accessor threat)
   (resonance :initarg :resonance :initform 0.0 :accessor resonance)))

(defgeneric contain (item)
  (:documentation "Contiene el objeto si su resonancia lo permite."))

(defmethod contain ((item object-of-power))
  (if (> (resonance item) +max-resonance+)
      (error "Brecha en ~a" (code item))
      (setf (resonance item) 0.0)))

(defun dangerous (items)
  (loop for i in items
        when (eq (threat i) :high)
          collect (code i)))

(format t "~{~a~%~}" (dangerous (list (make-instance 'object-of-power :code "OOP-0001" :threat :high))))
