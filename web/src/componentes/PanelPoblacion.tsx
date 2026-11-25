import { useCallback } from "react";
import * as Plot from "@observablehq/plot";
import { Grafica } from "./Grafica";
import { colorToken } from "./colores";
import type { Poblacion } from "../datos";

interface Props {
  poblacion: Poblacion;
  /** Código del departamento seleccionado, o null para todo el país. */
  departamento: number | null;
  nombre: string;
  /** Año final del filtro de tiempo; se acota al rango de la proyección. */
  anio: number;
}

/** Población proyectada del territorio elegido, con la serie completa y el año del filtro resaltado. */
export function PanelPoblacion({ poblacion, departamento, nombre, anio }: Props) {
  const serie = departamento === null ? poblacion.pais : poblacion.departamentos[String(departamento)];
  const { anios } = poblacion;
  const anioMostrado = Math.min(Math.max(anio, anios[0]), anios[anios.length - 1]);
  const valor = serie?.[anios.indexOf(anioMostrado)];

  const dibujar = useCallback(
    (ancho: number) => {
      const puntos = anios.map((a, i) => ({ anio: a, poblacion: serie[i] }));
      return Plot.plot({
        width: ancho,
        height: 120,
        marginLeft: 16,
        marginRight: 16,
        style: { fontFamily: "var(--ine-fuente)", fontSize: "11px" },
        x: { label: null, tickFormat: (a: number) => String(a), ticks: [anios[0], anios[anios.length - 1]] },
        y: { axis: null, zero: false },
        marks: [
          Plot.lineY(puntos, { x: "anio", y: "poblacion", stroke: colorToken("--ine-serie-1"), strokeWidth: 2 }),
          Plot.dot(puntos.filter((p) => p.anio === anioMostrado), {
            x: "anio",
            y: "poblacion",
            r: 4,
            fill: colorToken("--ine-azul-oscuro"),
          }),
        ],
      });
    },
    [anios, serie, anioMostrado],
  );

  if (!serie || valor === undefined) return null;

  return (
    <div className="panel-poblacion">
      <p className="panel-poblacion-valor ine-num">
        <strong>{valor.toLocaleString("es-GT")}</strong> habitantes en {nombre}, {anioMostrado}
        {anioMostrado !== anio && <span className="nota"> (la proyección cubre {anios[0]}–{anios[anios.length - 1]})</span>}
      </p>
      <Grafica dibujar={dibujar} etiqueta={`Población proyectada de ${nombre}, ${anios[0]} a ${anios[anios.length - 1]}`} />
      <p className="fuente">Fuente: INE, proyecciones de población 2015–2030.</p>
    </div>
  );
}
