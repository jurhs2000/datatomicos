interface Props {
  minimo: number;
  maximo: number;
  desde: number;
  hasta: number;
  onCambio: (desde: number, hasta: number) => void;
}

/** Selector de rango de años con dos controles. Mantiene desde ≤ hasta. */
export function LineaDeTiempo({ minimo, maximo, desde, hasta, onCambio }: Props) {
  return (
    <fieldset className="linea-tiempo">
      <legend>Periodo</legend>
      <div className="linea-tiempo-valores ine-num">
        <span>{desde}</span>
        <span>{hasta}</span>
      </div>
      <label>
        Desde
        <input
          type="range"
          min={minimo}
          max={maximo}
          value={desde}
          onChange={(e) => onCambio(Math.min(Number(e.target.value), hasta), hasta)}
        />
      </label>
      <label>
        Hasta
        <input
          type="range"
          min={minimo}
          max={maximo}
          value={hasta}
          onChange={(e) => onCambio(desde, Math.max(Number(e.target.value), desde))}
        />
      </label>
    </fieldset>
  );
}
