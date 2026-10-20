# Archivo de prueba del tema: Gherkin.
@containment
Feature: Contención de Objetos de Poder
  Como directora de la Agencia
  quiero contener los objetos con resonancia alta
  para que el Siseo no se propague

  Background:
    Given the Oldest House is sealed

  Scenario Outline: Contener un objeto
    Given an object "<code>" with resonance <resonance>
    When the director contains it
    Then its status is "<status>"

    Examples:
      | code     | resonance | status    |
      | OOP-0001 | 12.5      | contained |
      | OOP-0002 | 1500      | breach    |
