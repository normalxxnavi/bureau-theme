# Archivo de prueba del tema: Crystal.
require "json"

module Bureau
  # Nivel de amenaza de un Objeto de Poder.
  enum Threat
    Low  = 1
    High = 2
  end

  class ObjectOfPower
    include JSON::Serializable
    MAX_RESONANCE = 1_000.0

    getter code : String
    property threat : Threat
    @resonance : Float64 = 0.0

    def initialize(@code : String, @threat = Threat::Low)
    end

    def contain! : Bool
      raise "Brecha en #{@code}" if @resonance > MAX_RESONANCE
      @resonance = 0.0
      true
    end
  end
end

items = (1..3).map { |n| Bureau::ObjectOfPower.new("OOP-%04d" % n, n > 1 ? Bureau::Threat::High : Bureau::Threat::Low) }
items.select(&.threat.high?).each do |item|
  puts "#{item.code}: #{item.contain!}"
end
