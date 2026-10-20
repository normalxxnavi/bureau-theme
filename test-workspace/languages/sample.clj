;; Archivo de prueba del tema: Clojure.
(ns bureau.research
  (:require [clojure.string :as str]))

(def ^:const max-resonance 1000.0)

(defrecord ObjectOfPower [code threat resonance])

(defn contain
  "Devuelve el objeto contenido o lanza si hay una brecha."
  [{:keys [code resonance] :as item}]
  (if (> resonance max-resonance)
    (throw (ex-info (str "Brecha en " code) {:code code}))
    (assoc item :resonance 0.0)))

(defmacro with-board [& body]
  `(do (println "<<THE BOARD OBSERVES.>>") ~@body))

(def items
  (for [n (range 1 4)]
    (->ObjectOfPower (format "OOP-%04d" n) (* n 2) 0.5)))

(with-board
  (doseq [item (filter #(> (:threat %) 2) items)]
    (println (:code (contain item)) \H nil true #"OOP-\d{4}")))

(-> items first :code str/lower-case println)
