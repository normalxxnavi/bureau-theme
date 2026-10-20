# Archivo de prueba del tema: CoffeeScript.
MAX_RESONANCE = 1e3

###
Un Objeto de Poder registrado.
###
class ObjectOfPower
  constructor: (@code, @threat = 1, @resonance = 0.0) ->

  contain: ->
    throw new Error "Brecha en #{@code}" if @resonance > MAX_RESONANCE
    @resonance = 0
    yes

  describe: => "#{@code} [#{@threat}]"

class Hotline extends ObjectOfPower
  ring: (times = 1) -> console.log 'ring' for i in [1..times]

items = (new ObjectOfPower "OOP-000#{n}", n * 2 for n in [1..3])
dangerous = (item for item in items when item.threat > 2)

for item in dangerous
  console.log item.describe(), item.contain()

sector = switch
  when items.length is 0 then 'vacío'
  when items.length < 5 then 'research'
  else 'containment'
pattern = /^OOP-\d{4}$/
