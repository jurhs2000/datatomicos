import { useCallback } from "react";
import * as Plot from "@observablehq/plot";
import { nombreLugar, textoPeriodo, type KpiCifra, type Lugar, type ProductoCifras } from "../datos";
import { formatearCifra, resumirCifra } from "../cifras";
import { Grafica } from "./Grafica";
import { colorToken } from "./colores";

interface Props {
  producto: ProductoCifras;
  lugar: Lugar;
  desde: number;
  hasta: number;
}

export function TarjetaProducto({ producto, lugar, desde, hasta }: Props) {
  return (
    <article className="tarjeta-cifra tarjeta-producto ine-esquina-sm" aria-label={producto.titulo}>
      <header className="tarjeta-cifra-encabezado"><h4>{producto.titulo}</h4></header>
      <p className="nota">{producto.nota}</p>
      <div className="producto-kpis">
        {producto.kpis.map((kpi) => <BloqueKpi key={kpi.id} producto={producto} kpi={kpi} lugar={lugar} desde={desde} hasta={hasta} />)}
      </div>
      <p className="fuente">Origen: <a href={producto.url} target="_blank" rel="noreferrer">{producto.operacion_nombre}{producto.edicion ? ` · ${producto.edicion}` : ""} · INE</a></p>
      <p className="fuente">Fuente: {producto.fuente}. Descarga: {producto.fecha_descarga}.</p>
    </article>
  );
}

function BloqueKpi({ producto, kpi, lugar, desde, hasta }: Props & { kpi: KpiCifra }) {
  const resumen = resumirCifra(producto, kpi.id, lugar, desde, hasta);
  const primero = producto.anios[0];
  const ultimo = producto.anios.at(-1)!;
  const dibujar = useCallback((ancho: number) => {
    const serie = resumen?.serie ?? [];
    // Los años sin fila o sin denominador cortan la línea en lugar de inventar valores.
    const puntos = producto.anios.map((anio) => ({ anio, valor: serie.find((f) => f.anio === anio)?.valor ?? null }));
    const banda = desde <= ultimo && hasta >= primero
      ? [{ x1: Math.max(desde, primero) - 0.5, x2: Math.min(hasta, ultimo) + 0.5 }] : [];
    return Plot.plot({
      width: ancho, height: 110, marginLeft: 16, marginRight: 16,
      style: { fontFamily: "var(--ine-fuente)", fontSize: "11px" },
      x: { label: null, domain: [primero - 0.5, ultimo + 0.5], ticks: primero === ultimo ? [primero] : [primero, ultimo], tickFormat: (a: number) => String(a) },
      y: { axis: null, zero: false },
      marks: [
        Plot.rect(banda, { x1: "x1", x2: "x2", fill: colorToken("--ine-gris-claro"), fillOpacity: 0.6 }),
        Plot.lineY(puntos, { x: "anio", y: "valor", stroke: colorToken("--ine-serie-1"), strokeWidth: 2 }),
        Plot.dot(serie.filter((f) => f.valor !== null), { x: "anio", y: "valor", r: 2, fill: colorToken("--ine-serie-1") }),
        Plot.dot(resumen ? [resumen.elegida] : [], { x: "anio", y: "valor", r: 4, fill: colorToken("--ine-azul-oscuro") }),
      ],
    });
  }, [producto.anios, resumen, primero, ultimo, desde, hasta]);

  return (
    <section className="producto-kpi" aria-label={kpi.nombre}>
      <h5>{kpi.nombre}</h5>
      {!resumen ? <p className="nota">Sin datos disponibles para {nombreLugar(lugar)} ni para un nivel superior.</p> : <>
        <p className="tarjeta-cifra-valor ine-num"><strong>{formatearCifra(resumen.elegida.valor, kpi)}</strong> <span>{kpi.unidad}</span><span className="tarjeta-cifra-anio"> · {resumen.elegida.anio}</span></p>
        {resumen.nivelSuperior && <p className="nota">Se muestran cifras de {resumen.nivel.nombre} (nivel {resumen.nivel.nivel === "pais" ? "nacional" : "departamental"}); no hay datos disponibles para {lugar.nivel === "pais" ? "el país" : lugar.nombre}.</p>}
        {resumen.fueraDeRango && <p className="nota">Este producto cubre {textoPeriodo(primero, ultimo)}. Sin datos en {textoPeriodo(desde, hasta)}; se muestra el año disponible más cercano.</p>}
        <Grafica dibujar={dibujar} etiqueta={`${kpi.nombre} de ${resumen.nivel.nombre}, ${primero} a ${ultimo}; periodo seleccionado ${textoPeriodo(desde, hasta)}`} />
        <details className="tabla-proyeccion">
          <summary>Ver datos por año: {kpi.nombre}</summary>
          <table><caption>{kpi.nombre} · {resumen.nivel.nombre} · {kpi.unidad}</caption>
            <thead><tr><th scope="col">Año</th><th scope="col">Valor</th></tr></thead>
            <tbody>{producto.anios.map((anio) => <tr key={anio}><th scope="row">{anio}</th><td>{formatearCifra(resumen.serie.find((f) => f.anio === anio)?.valor ?? null, kpi)}</td></tr>)}</tbody>
          </table>
        </details>
      </>}
    </section>
  );
}
