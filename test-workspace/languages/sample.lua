-- Archivo de prueba del tema: Lua.
local MAX_RESONANCE <const> = 1e3

--- Un Objeto de Poder registrado.
local ObjectOfPower = {}
ObjectOfPower.__index = ObjectOfPower

function ObjectOfPower.new(code, threat)
  local self = setmetatable({}, ObjectOfPower)
  self.code = code or "OOP-0000"
  self.threat = threat or 1
  self.resonance = 0.0
  return self
end

function ObjectOfPower:contain()
  if self.resonance > MAX_RESONANCE then
    error(("Brecha en %s"):format(self.code))
  end
  self.resonance = 0
  return true
end

local items = {}
for n = 1, 3 do
  items[#items + 1] = ObjectOfPower.new(string.format("OOP-%04d", n), n * 2)
end

for _, item in ipairs(items) do
  if item.threat > 2 and not (item.code == nil) then
    print(item.code .. " " .. tostring(item:contain()))
  end
end

local text = [[
Bloque de texto
de varias líneas]]
goto done
::done::
