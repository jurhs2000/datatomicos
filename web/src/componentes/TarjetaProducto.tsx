import { useCallback, useMemo, useState } from "react";
import * as Plot from "@observablehq/plot";
import { nombreLugar, textoPeriodo, type FilaCifra, type KpiCifra, type Lugar, type ProductoCifras } from "../datos";
import { formatearCifra, resumirCifra } from "../cifras";
import { Grafica } from "./Grafica";
import { GraficaAnualCifra } from "./GraficaAnualCifra";
import { NotasCifra } from "./NotasCifra";
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
      <NotasCifra notas={[producto.nota]} />
      <div className="producto-kpis">
        {producto.kpis.map((kpi) => <BloqueKpi key={kpi.id} producto={producto} kpi={kpi} lugar={lugar} desde={desde} hasta={hasta} />)}
      </div>
      <p className="fuente">Origen: <a href={producto.url} target="_blank" rel="noreferrer">{producto.operacion_nombre}{producto.edicion ? ` · ${producto.edicion}` : ""} · INE</a></p>
      <p className="fuente">Fuente: {producto.fuente}. Descarga: {producto.fecha_descarga}.</p>
    </article>
  );
}

function BarraPorcentaje({ fila, kpi, lugar }: { fila: FilaCifra; kpi: KpiCifra; lugar: string }) {
  const dibujar = useCallback((ancho: number) => Plot.plot({
    width: ancho, height: 85, marginTop: 4, marginLeft: 18, marginRight: 24, marginBottom: 38,
    style: { fontFamily: "var(--ine-fuente)", fontSize: "11px", color: colorToken("--ine-texto-secundario") },
    x: { label: "Porcentaje (%)", labelArrow: false, domain: [0, 100], ticks: [0, 25, 50, 75, 100] },
    y: { axis: null },
    marks: [
      Plot.barX([{ valor: 100 }], { x: "valor", fill: colorToken("--ine-gris-claro"), fillOpacity: 0.5 }),
      Plot.barX([fila], { x: "valor", fill: colorToken("--ine-serie-1") }),
    ],
  }), [fila]);
  return <Grafica dibujar={dibujar} etiqueta={`${kpi.nombre}, ${lugar}, ${fila.anio}: ${formatearCifra(fila.valor, kpi)} %. Barra sobre una escala de 0 a 100 %. Base: ${fila.numerador} de ${fila.denominador} registros.`} />;
}

function BloqueKpi({ producto, kpi, lugar, desde, hasta }: Props & { kpi: KpiCifra }) {
  const resumen = useMemo(() => resumirCifra(producto, kpi.id, lugar, desde, hasta), [producto, kpi.id, lugar, desde, hasta]);
  const [evolucionAbierta, setEvolucionAbierta] = useState(false);
  const porcentaje = kpi.tipo === "porcentaje";
  const primero = producto.anios[0];
  const ultimo = producto.anios.at(-1)!;
  const anual = resumen && <GraficaAnualCifra kpi={kpi} anios={producto.anios} serie={resumen.serie} anioElegido={resumen.elegida.anio} lugar={resumen.nivel.nombre} desde={desde} hasta={hasta} />;

  return (
    <section className={`producto-kpi${porcentaje ? "" : " producto-kpi-serie"}`} aria-label={kpi.nombre}>
      <h5>{kpi.nombre}</h5>
      {!resumen ? <p className="nota">Sin datos disponibles para {nombreLugar(lugar)} ni para un nivel superior.</p> : <>
        <p className="tarjeta-cifra-valor ine-num"><strong>{formatearCifra(resumen.elegida.valor, kpi)}</strong> <span>{kpi.unidad}</span><span className="tarjeta-cifra-anio"> · {resumen.elegida.anio}</span></p>
        <NotasCifra notas={[
          resumen.nivelSuperior && `Se muestran cifras de ${resumen.nivel.nombre} (nivel ${resumen.nivel.nivel === "pais" ? "nacional" : "departamental"}); no hay datos disponibles para ${lugar.nivel === "pais" ? "el país" : lugar.nombre}.`,
          resumen.fueraDeRango && `Este producto cubre ${textoPeriodo(primero, ultimo)}. Sin datos en ${textoPeriodo(desde, hasta)}; se muestra el año disponible más cercano.`,
          porcentaje && `Base del porcentaje: ${resumen.elegida.numerador?.toLocaleString("es-GT")} de ${resumen.elegida.denominador?.toLocaleString("es-GT")} registros.`,
        ]} />
        {porcentaje ? <BarraPorcentaje fila={resumen.elegida} kpi={kpi} lugar={resumen.nivel.nombre} /> : anual}
        <details className="tabla-proyeccion" onToggle={(e) => setEvolucionAbierta(e.currentTarget.open)}>
          <summary>{porcentaje ? "Ver evolución anual y datos" : "Ver datos por año"}: {kpi.nombre}</summary>
          {porcentaje && evolucionAbierta && anual}
          <table><caption>{kpi.nombre} · {resumen.nivel.nombre} · {kpi.unidad}</caption>
            <thead><tr><th scope="col">Año</th><th scope="col">Valor</th>{porcentaje && <><th scope="col">Numerador</th><th scope="col">Denominador</th></>}</tr></thead>
            <tbody>{producto.anios.map((anio) => {
              const fila = resumen.serie.find((f) => f.anio === anio);
              return <tr key={anio}><th scope="row">{anio}</th><td>{formatearCifra(fila?.valor ?? null, kpi)}</td>{porcentaje && <><td>{fila?.numerador?.toLocaleString("es-GT") ?? "Sin dato"}</td><td>{fila?.denominador?.toLocaleString("es-GT") ?? "Sin dato"}</td></>}</tr>;
            })}</tbody>
          </table>
        </details>
      </>}
    </section>
  );
}
