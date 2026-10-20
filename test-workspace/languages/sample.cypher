// Archivo de prueba del tema: Cypher.
MATCH (a:Agent {name: 'Jesse Faden'})-[:CONTAINED]->(o:ObjectOfPower)
WHERE o.threat > 2 AND o.resonance < 1000.0
WITH a, collect(o.code) AS codes, count(o) AS total
RETURN a.name AS director, codes, total
ORDER BY total DESC
LIMIT 10;

CREATE (h:ObjectOfPower {code: "OOP-0001", name: "Hotline", threat: 7})
MERGE (s:Sector {name: "research"})
MERGE (h)-[:LOCATED_IN {floor: -3}]->(s);
