import type { ReactNode } from "react";

/** Aclaraciones de lectura compartidas por las tarjetas de «En cifras». */
export function NotasCifra({ notas }: { notas: ReactNode[] }) {
  const visibles = notas.filter(Boolean);
  if (!visibles.length) return null;
  return (
    <aside className="notas-cifra" aria-label="Notas de lectura">
      <p className="notas-cifra-titulo">Notas de lectura</p>
      <ul>{visibles.map((nota, i) => <li key={i}>{nota}</li>)}</ul>
    </aside>
  );
}
