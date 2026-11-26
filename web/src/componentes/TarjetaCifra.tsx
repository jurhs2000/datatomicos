import type { ReactNode } from "react";
import { NotasCifra } from "./NotasCifra";

export interface Origen {
  /** De qué producto u operación sale la cifra, p. ej. «Proyecciones de población 2015–2030 · INE». */
  texto: string;
  url?: string | null;
}

interface Props {
  titulo: string;
  /** La cifra ya formateada. */
  cifra: string;
  unidad?: string;
  /** Año o periodo al que corresponde la cifra. */
  anio: string | number;
  /** Aclaración corta bajo la cifra (p. ej., que el año se acotó al rango disponible). */
  nota?: ReactNode;
  /** Marca la cifra como cálculo del equipo, no oficial. */
  estimacion?: boolean;
  origen: Origen;
  /** Tendencia u otra gráfica pequeña. */
  children?: ReactNode;
  /** Botón o enlace al pie de la tarjeta. */
  accion?: ReactNode;
}

/**
 * Tarjeta común de «En cifras»: una cifra, su año, una tendencia opcional y de dónde sale.
 * Cualquier cifra nueva del pipeline se muestra con esta tarjeta, sin rediseñar la ficha.
 */
export function TarjetaCifra({ titulo, cifra, unidad, anio, nota, estimacion, origen, children, accion }: Props) {
  return (
    <article className={`tarjeta-cifra ine-esquina-sm${estimacion ? " tarjeta-cifra-estimacion" : ""}`}>
      <header className="tarjeta-cifra-encabezado">
        <h4>{titulo}</h4>
        {estimacion && <span className="etiqueta-estimacion">Estimación del equipo</span>}
      </header>
      <p className="tarjeta-cifra-valor ine-num">
        <strong>{cifra}</strong>
        {unidad && <span> {unidad}</span>}
        <span className="tarjeta-cifra-anio"> · {anio}</span>
      </p>
      <NotasCifra notas={[nota]} />
      {children}
      <p className="fuente">
        Origen:{" "}
        {origen.url ? (
          <a href={origen.url} target="_blank" rel="noreferrer">
            {origen.texto}
          </a>
        ) : (
          origen.texto
        )}
      </p>
      {accion}
    </article>
  );
}
