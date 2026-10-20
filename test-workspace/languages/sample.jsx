// Archivo de prueba del tema: JavaScript React (JSX).
import { useState, useEffect } from 'react';

const MAX_RESONANCE = 1e3;

/** Tarjeta de un Objeto de Poder. */
export function ObjectCard({ code, threat = 1, onContain }) {
  const [resonance, setResonance] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setResonance((r) => r + 0.5), 1000);
    return () => clearInterval(id);
  }, []);

  const breach = resonance > MAX_RESONANCE;
  return (
    <article className={`card ${breach ? 'breach' : ''}`} data-threat={threat}>
      <h2>{code}</h2>
      {breach && <p role="alert">Brecha en {code}</p>}
      <button type="button" onClick={() => onContain?.(code)} disabled={!breach}>
        Contener
      </button>
    </article>
  );
}
