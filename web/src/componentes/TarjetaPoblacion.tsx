import { useCallback } from "react";
import * as Plot from "@observablehq/plot";
import { Grafica } from "./Grafica";
import { TarjetaCifra, type Origen } from "./TarjetaCifra";
import { colorToken } from "./colores";
import { nombreLugar, type Lugar, type Poblacion } from "../datos";

interface Props {
  poblacion: Poblacion;
  lugar: Lugar;
  desde: number;
  hasta: number;
  /** Operación y edición del producto que da la cifra; si falta, se usa la fuente del archivo. */
  origen?: Origen;
}

function serieDe(poblacion: Poblacion, lugar: Lugar): number[] | undefined {
  if (lugar.nivel === "pais") return poblacion.pais;
  if (lugar.nivel === "departamento") return poblacion.departamentos[String(lugar.codigo)];
  return poblacion.municipios[String(lugar.codigo)];
}

/** Población proyectada del lugar al final del periodo, con la serie completa y el periodo resaltado. */
export function TarjetaPoblacion({ poblacion, lugar, desde, hasta, origen }: Props) {
  const serie = serieDe(poblacion, lugar);
  const { anios } = poblacion;
  const primero = anios[0];
  const ultimo = anios[anios.length - 1];
  const anio = Math.min(Math.max(hasta, primero), ultimo);
  const valor = serie?.[anios.indexOf(anio)];

  const dibujar = useCallback(
    (ancho: number) => {
      const puntos = anios.map((a, i) => ({ anio: a, poblacion: serie![i] }));
      const banda = [{ x1: Math.max(desde, primero) - 0.5, x2: Math.min(hasta, ultimo) + 0.5 }];
      return Plot.plot({
        width: ancho,
        height: 110,
        marginLeft: 16,
        marginRight: 16,
        style: { fontFamily: "var(--ine-fuente)", fontSize: "11px" },
        x: { label: null, tickFormat: (a: number) => String(a), ticks: [primero, ultimo] },
        y: { axis: null, zero: false },
        marks: [
          // Sin y1/y2, el rectángulo ocupa todo el alto: marca el periodo elegido.
          Plot.rect(banda, { x1: "x1", x2: "x2", fill: colorToken("--ine-gris-claro"), fillOpacity: 0.6 }),
          Plot.lineY(puntos, { x: "anio", y: "poblacion", stroke: colorToken("--ine-serie-1"), strokeWidth: 2 }),
          Plot.dot(puntos.filter((p) => p.anio === anio), { x: "anio", y: "poblacion", r: 4, fill: colorToken("--ine-azul-oscuro") }),
        ],
      });
    },
    [anios, serie, anio, desde, hasta, primero, ultimo],
  );

  if (!serie || valor === undefined) return null;
  const nombre = nombreLugar(lugar);

  return (
    <TarjetaCifra
      titulo="Población"
      cifra={valor.toLocaleString("es-GT")}
      unidad="habitantes"
      anio={anio}
      nota={anio !== hasta ? `La proyección cubre ${primero}–${ultimo}.` : undefined}
      origen={origen ?? { texto: `Estimaciones y proyecciones de población ${primero}–${ultimo} · INE`, url: poblacion.url }}
    >
      <Grafica dibujar={dibujar} etiqueta={`Población proyectada de ${nombre}, ${primero} a ${ultimo}`} />
    </TarjetaCifra>
  );
}
