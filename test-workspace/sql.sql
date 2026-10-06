-- Archivo de prueba del tema: SQL
CREATE TABLE IF NOT EXISTS objects_of_power (
    id          INTEGER PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    sector      VARCHAR(60)  NOT NULL DEFAULT 'Research',
    threat      DECIMAL(4, 2) CHECK (threat >= 0),
    recovered   TIMESTAMP,
    is_sealed   BOOLEAN DEFAULT FALSE
);

/* Objetos con amenaza alta recuperados este año */
SELECT o.name,
       o.sector,
       COUNT(*) AS incidents,
       MAX(i.severity) AS worst
FROM objects_of_power AS o
LEFT JOIN incidents AS i ON i.object_id = o.id
WHERE o.threat > 0.5
  AND o.recovered >= '2026-01-01'
  AND o.name LIKE '%Projector%'
GROUP BY o.name, o.sector
HAVING COUNT(*) > 1
ORDER BY worst DESC
LIMIT 10;

UPDATE objects_of_power SET is_sealed = TRUE WHERE id IN (1, 2, 3);
DELETE FROM incidents WHERE severity IS NULL;
