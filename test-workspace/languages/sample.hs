-- Archivo de prueba del tema: Haskell.
{-# LANGUAGE OverloadedStrings #-}
module Bureau.Registry (ObjectOfPower (..), Threat (..), contain, dangerous) where

import Data.List (sortOn)
import qualified Data.Map.Strict as Map

-- | Nivel de amenaza de un Objeto de Poder.
data Threat = Low | High
  deriving (Show, Eq, Ord)

data ObjectOfPower = ObjectOfPower
  { code :: String
  , threat :: Threat
  , resonance :: Double
  }
  deriving (Show)

class Containable a where
  contain :: a -> Either String a

maxResonance :: Double
maxResonance = 1.0e3

instance Containable ObjectOfPower where
  contain item
    | resonance item > maxResonance = Left ("Brecha en " ++ code item)
    | otherwise = Right item {resonance = 0}

dangerous :: [ObjectOfPower] -> [String]
dangerous items = [code i | i <- sortOn code items, threat i == High]

main :: IO ()
main = do
  let items = [ObjectOfPower ("OOP-000" ++ show n) (if n > 1 then High else Low) 0.5 | n <- [1 .. 3 :: Int]]
      registry = Map.fromList [(code i, i) | i <- items]
  mapM_ putStrLn (dangerous items)
  print (Map.size registry, 'J', True)
