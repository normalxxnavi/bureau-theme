-- Archivo de prueba del tema: PureScript.
module Bureau.Registry where

import Prelude

import Data.Array (filter)
import Data.Either (Either(..))
import Effect (Effect)
import Effect.Console (log)

-- | Nivel de amenaza de un Objeto de Poder.
data Threat = Low | High

derive instance eqThreat :: Eq Threat

type ObjectOfPower = { code :: String, threat :: Threat, resonance :: Number }

maxResonance :: Number
maxResonance = 1000.0

contain :: ObjectOfPower -> Either String ObjectOfPower
contain item
  | item.resonance > maxResonance = Left ("Brecha en " <> item.code)
  | otherwise = Right item { resonance = 0.0 }

main :: Effect Unit
main = do
  let items = [ { code: "OOP-0001", threat: High, resonance: 12.5 } ]
  for_ (filter (\i -> i.threat == High) items) \item ->
    case contain item of
      Right c -> log c.code
      Left e -> log e
  where
  for_ xs f = void (traverse f xs)
  traverse = map
