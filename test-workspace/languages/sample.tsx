// Archivo de prueba del tema: TypeScript React (TSX).
import { useMemo, type ReactNode } from 'react';

enum Threat {
  Low = 1,
  High = 2,
}

interface ObjectOfPower {
  readonly code: string;
  threat: Threat;
  tags?: string[];
}

type Props<T extends ObjectOfPower> = {
  items: T[];
  render?: (item: T) => ReactNode;
};

/** Lista de Objetos de Poder ordenada por amenaza. */
export function Registry<T extends ObjectOfPower>({ items, render }: Props<T>) {
  const sorted = useMemo(() => [...items].sort((a, b) => b.threat - a.threat), [items]);
  return (
    <ul aria-label="Registro">
      {sorted.map((item) => (
        <li key={item.code} className={item.threat === Threat.High ? 'high' : undefined}>
          {render ? render(item) : <span>{item.code}</span>}
        </li>
      ))}
    </ul>
  );
}
