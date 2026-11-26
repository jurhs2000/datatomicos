interface Props {
  minimo: number;
  maximo: number;
  desde: number;
  hasta: number;
  onCambio: (desde: number, hasta: number) => void;
}

/** Selector de rango de años con dos manijas. Mantiene desde ≤ hasta. */
export function LineaDeTiempo({ minimo, maximo, desde, hasta, onCambio }: Props) {
  const amplitud = maximo - minimo;
  const inicio = amplitud ? ((desde - minimo) / amplitud) * 100 : 0;
  const fin = amplitud ? ((hasta - minimo) / amplitud) * 100 : 100;
  return (
    <fieldset className="linea-tiempo">
      <legend>Periodo</legend>
      <div className="linea-tiempo-valores ine-num">
        <span>Desde {desde}</span>
        <span>Hasta {hasta}</span>
      </div>
      <div className="linea-tiempo-control">
        <div className="linea-tiempo-pista" aria-hidden="true">
          <div className="linea-tiempo-seleccion" style={{ left: `${inicio}%`, right: `${100 - fin}%` }} />
        </div>
        <input
          type="range"
          aria-label="Año desde"
          min={minimo}
          max={maximo}
          aria-valuemax={hasta}
          value={desde}
          style={{ zIndex: desde === maximo ? 3 : 1 }}
          onChange={(e) => onCambio(Math.min(Number(e.target.value), hasta), hasta)}
        />
        <input
          type="range"
          aria-label="Año hasta"
          min={minimo}
          max={maximo}
          aria-valuemin={desde}
          value={hasta}
          onChange={(e) => onCambio(desde, Math.max(Number(e.target.value), desde))}
        />
      </div>
      <p className="nota">Se muestran publicaciones que cubren al menos un año del periodo seleccionado.</p>
    </fieldset>
  );
}
