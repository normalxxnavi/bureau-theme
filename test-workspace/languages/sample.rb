# frozen_string_literal: true
# Archivo de prueba del tema: Ruby.

require 'json'

module Bureau
  # Un Objeto de Poder registrado.
  class ObjectOfPower
    MAX_RESONANCE = 1_000.0
    attr_reader :code, :threat

    def initialize(code:, threat: 1, resonance: 0.0)
      raise ArgumentError, "Código inválido: #{code}" unless code.match?(/\AOOP-\d{4}\z/)

      @code = code
      @threat = threat
      @resonance = resonance
    end

    def contain!
      return false if @resonance > MAX_RESONANCE

      @resonance = 0.0
      true
    end

    def to_h = { code: @code, threat: @threat }

    def self.registry
      @registry ||= []
    end
  end
end

items = (1..3).map { |n| Bureau::ObjectOfPower.new(code: format('OOP-%04d', n), threat: n * 2) }
items.select { _1.threat > 2 }.each do |item|
  puts "#{item.code}: #{item.contain! ? :contained : :breach}"
end
case items.size
when 0 then puts 'vacío'
when 1..5 then puts JSON.generate(items.map(&:to_h))
else puts "demasiados: #{items.size}"
end
