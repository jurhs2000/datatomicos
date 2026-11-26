import { useCallback } from "react";
import * as Plot from "@observablehq/plot";
import type { FilaCifra, KpiCifra } from "../datos";
import { textoPeriodo } from "../datos";
import { Grafica } from "./Grafica";
import { colorToken } from "./colores";

interface Props {
  kpi: KpiCifra;
  anios: number[];
  serie: FilaCifra[];
  anioElegido: number;
  lugar: string;
  desde: number;
  hasta: number;
}

/** Cantidades anuales en columnas; porcentajes y tasas en líneas con escala explícita. */
export function GraficaAnualCifra({ kpi, anios, serie, anioElegido, lugar, desde, hasta }: Props) {
  const dibujar = useCallback((ancho: number) => {
    const primero = anios[0];
    const ultimo = anios.at(-1)!;
    const porAnio = new Map(serie.map((f) => [f.anio, f.valor]));
    const puntos = anios.map((anio) => ({ anio, valor: porAnio.get(anio) ?? null }));
    const disponibles = puntos.filter((p) => p.valor !== null);
    const banda = desde <= ultimo && hasta >= primero
      ? [{ x1: Math.max(desde, primero) - 0.5, x2: Math.min(hasta, ultimo) + 0.5 }] : [];
    const cantidadTicks = Math.min(anios.length, Math.max(2, Math.floor((ancho - 90) / 46)));
    const ticks = cantidadTicks === 1 ? [primero] : Array.from({ length: cantidadTicks }, (_, i) => anios[Math.round(i * (anios.length - 1) / (cantidadTicks - 1))]);
    const conteo = kpi.tipo === "conteo";
    const maximo = Math.max(0, ...disponibles.map((p) => p.valor ?? 0));
    return Plot.plot({
      width: ancho, height: 210, marginTop: 32, marginLeft: 72, marginBottom: 38, marginRight: 18,
      style: { fontFamily: "var(--ine-fuente)", fontSize: "11px", color: colorToken("--ine-texto-secundario") },
      x: { label: "Año", labelArrow: false, domain: [primero - 0.5, ultimo + 0.5], ticks, tickFormat: (a: number) => String(a) },
      y: {
        label: kpi.unidad, labelArrow: false, zero: true,
        domain: kpi.tipo === "porcentaje" ? [0, 100] : [0, maximo || 1],
        nice: true,
        ticks: conteo ? Math.min(4, maximo || 1) : 4, grid: true,
        tickFormat: (v: number) => v.toLocaleString("es-GT", { maximumFractionDigits: conteo ? 0 : 1 }),
      },
      marks: [
        Plot.rect(banda, { x1: "x1", x2: "x2", fill: colorToken("--ine-gris-claro"), fillOpacity: 0.35 }),
        ...(conteo ? [
          Plot.rectY(disponibles, {
            x1: (p) => p.anio - 0.35, x2: (p) => p.anio + 0.35, y: "valor",
            fill: (p) => colorToken(p.anio === anioElegido ? "--ine-azul-oscuro" : "--ine-serie-1"),
          }),
        ] : [
          // Los años sin fila cortan la línea; cero sigue siendo un valor observado.
          Plot.lineY(puntos, { x: "anio", y: "valor", stroke: colorToken("--ine-serie-1"), strokeWidth: 2 }),
          Plot.dot(disponibles, { x: "anio", y: "valor", r: 3, fill: colorToken("--ine-serie-1") }),
          Plot.dot(disponibles.filter((p) => p.anio === anioElegido), { x: "anio", y: "valor", r: 5, fill: colorToken("--ine-azul-oscuro") }),
        ]),
        Plot.ruleY([0]),
      ],
    });
  }, [kpi, anios, serie, anioElegido, desde, hasta]);

  return (
    <figure className="cifra-grafica-anual">
      <Grafica dibujar={dibujar} etiqueta={`${kpi.tipo === "conteo" ? "Columnas" : "Línea"} de ${kpi.nombre}, ${lugar}, en ${kpi.unidad}; ${anios[0]} a ${anios.at(-1)}. Periodo seleccionado ${textoPeriodo(desde, hasta)}. Año mostrado ${anioElegido}.`} />
      <figcaption>El sombreado marca {textoPeriodo(desde, hasta)}. Año destacado: {anioElegido}.</figcaption>
    </figure>
  );
}
