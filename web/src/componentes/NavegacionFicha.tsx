import type { ProductoCifras } from "../datos";
import type { VistaFicha } from "../ficha";

export function NavegacionFicha({ vista, total, onCambio }: { vista: VistaFicha; total: number; onCambio: (vista: VistaFicha) => void }) {
  return (
    <nav className="ficha-navegacion" aria-label="Vistas de la ficha">
      <button type="button" aria-pressed={vista === "cifras"} aria-controls="ficha-cifras" onClick={() => onCambio("cifras")}>En cifras</button>
      <button type="button" aria-pressed={vista === "productos"} aria-controls="ficha-productos" onClick={() => onCambio("productos")}>Productos <span className="ine-num">({total})</span></button>
    </nav>
  );
}

export function SelectorCifras({ productos, seleccion, onAlternar }: {
  productos: Pick<ProductoCifras, "producto" | "titulo">[];
  seleccion: Set<string>;
  onAlternar: (producto: string) => void;
}) {
  if (!productos.length) return null;
  return (
    <fieldset className="selector-cifras">
      <legend>Mostrar cifras de</legend>
      <div className="selector-cifras-botones">
        {productos.map((p) => (
          <button key={p.producto} type="button" aria-pressed={seleccion.has(p.producto)} aria-controls={`cifras-${encodeURIComponent(p.producto)}`} onClick={() => onAlternar(p.producto)}>
            {p.titulo}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
