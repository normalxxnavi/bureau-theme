# Archivo de prueba del tema: Julia.
module Bureau

using Statistics

export ObjectOfPower, contain!

const MAX_RESONANCE = 1.0e3

"""
    ObjectOfPower(code, threat)

Un Objeto de Poder registrado por la Agencia.
"""
mutable struct ObjectOfPower{T<:Real}
    code::String
    threat::Int
    resonance::T
end

ObjectOfPower(code::String, threat::Int) = ObjectOfPower(code, threat, 0.0)

function contain!(item::ObjectOfPower)
    if item.resonance > MAX_RESONANCE
        throw(ErrorException("Brecha en $(item.code)"))
    elseif item.threat < 0
        return false
    end
    item.resonance = zero(item.resonance)
    return true
end

@inline describe(item) = "$(item.code) [$(item.threat)]"

end # module

using .Bureau
items = [ObjectOfPower("OOP-000$n", 2n) for n in 1:3]
dangerous = filter(i -> i.threat > 2, items)
foreach(i -> println(contain!(i), " ", i.code), dangerous)
println(:research, ' ', 0x1F, " ", mean([1, 2, 3]))
