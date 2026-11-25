import { useCallback, useMemo } from "react";
import * as Plot from "@observablehq/plot";
import { Grafica } from "../componentes/Grafica";
import { colorToken } from "../componentes/colores";
import { useJson, type Coeficientes, type Departamento, type PuntoSerie, type Validacion } from "../datos";

// Fechas en UTC, igual que las escala Observable Plot, para que enero no se vea como diciembre.
const fecha = (texto: string) => new Date(`${texto}T00:00:00Z`);
const mesCorto = (d: Date) =>
  d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : d.toLocaleDateString("es-GT", { month: "short", timeZone: "UTC" }).replace(".", "");
const numero = (valor: number, decimales = 2) =>
  valor.toLocaleString("es-GT", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export function Ipc() {
  const serie = useJson<PuntoSerie[]>("ipc/serie.json");
  const validacion = useJson<Validacion>("ipc/validacion.json");
  const coeficientes = useJson<Coeficientes>("ipc/coeficientes.json");
  const departamentos = useJson<Departamento[]>("territorio/departamentos.json");

  if (serie.cargando || validacion.cargando || coeficientes.cargando || departamentos.cargando) return <p>Cargando el IPC…</p>;
  if ("error" in serie) return <p className="error">{serie.error}</p>;
  if ("error" in validacion) return <p className="error">{validacion.error}</p>;
  if ("error" in coeficientes) return <p className="error">{coeficientes.error}</p>;
  if ("error" in departamentos) return <p className="error">{departamentos.error}</p>;

  return (
    <div className="ipc">
      <h1>Índice de Precios al Consumidor</h1>
      <p>
        Serie mensual del IPC de la República publicada por el INE (base anual 2024 = 100), de{" "}
        {serie.datos[0].fecha.slice(0, 4)} a {serie.datos.at(-1)!.fecha.slice(0, 4)}.
      </p>
      <Validado serie={serie.datos} validacion={validacion.datos} />
      <Departamental coeficientes={coeficientes.datos} departamentos={departamentos.datos} />
    </div>
  );
}

function Validado({ serie, validacion }: { serie: PuntoSerie[]; validacion: Validacion }) {
  const { metricas } = validacion;
  const dibujar = useCallback(
    (ancho: number) => {
      const inicioPrueba = fecha(validacion.prueba.inicio);
      const historia = serie.map((p) => ({ fecha: fecha(p.fecha), ipc: p.ipc })).slice(-48);
      const meses = validacion.meses.map((m) => ({ ...m, fecha: fecha(m.fecha) }));
      return Plot.plot({
        width: ancho,
        height: 340,
        marginLeft: 48,
        marginBottom: 32,
        style: { fontFamily: "var(--ine-fuente)", fontSize: "13px" },
        x: { label: null, tickFormat: mesCorto },
        y: { label: "IPC", grid: true },
        marks: [
          Plot.areaY(meses, { x: "fecha", y1: "inferior_95", y2: "superior_95", fill: colorToken("--ine-serie-2"), fillOpacity: 0.12 }),
          Plot.areaY(meses, { x: "fecha", y1: "inferior_80", y2: "superior_80", fill: colorToken("--ine-serie-2"), fillOpacity: 0.22 }),
          Plot.ruleX([inicioPrueba], { stroke: colorToken("--ine-gris"), strokeDasharray: "4 4" }),
          Plot.lineY(historia, { x: "fecha", y: "ipc", stroke: colorToken("--ine-serie-1"), strokeWidth: 2 }),
          Plot.lineY(meses, { x: "fecha", y: "pronostico", stroke: colorToken("--ine-serie-2"), strokeWidth: 2, strokeDasharray: "6 3" }),
          Plot.text([{ x: inicioPrueba }], { x: "x", frameAnchor: "top", dx: 6, textAnchor: "start", text: () => "Prueba", fill: colorToken("--ine-gris-oscuro") }),
          Plot.tip(meses, Plot.pointerX({ x: "fecha", y: "pronostico", title: (m) => `Observado: ${numero(m.observado)}\nModelo: ${numero(m.pronostico)}` })),
        ],
      });
    },
    [serie, validacion],
  );

  return (
    <section className="bloque">
      <h2>
        En los últimos 12 meses, el modelo se desvió en promedio {numero(metricas.MAPE)} % de lo que publicó el INE
      </h2>
      <p className="nota">
        El modelo se entrenó con datos hasta {validacion.entrenamiento.fin.slice(0, 7)} y se comparó con lo observado
        de {validacion.prueba.inicio.slice(0, 7)} a {validacion.prueba.fin.slice(0, 7)}, meses que no vio al ajustarse.
      </p>
      <div className="leyenda">
        <span className="leyenda-oficial">IPC publicado por el INE</span>
        <span className="leyenda-estimado">Estimación del equipo, con intervalos de 80 % y 95 %</span>
      </div>
      <Grafica dibujar={dibujar} etiqueta="IPC observado y pronóstico del modelo en el periodo de prueba" />
      <dl className="metricas ine-num">
        <div>
          <dt>Error porcentual medio (MAPE)</dt>
          <dd>{numero(metricas.MAPE)} %</dd>
        </div>
        <div>
          <dt>Error absoluto medio (MAE)</dt>
          <dd>{numero(metricas.MAE)} puntos</dd>
        </div>
        <div>
          <dt>Raíz del error cuadrático medio (RMSE)</dt>
          <dd>{numero(metricas.RMSE)} puntos</dd>
        </div>
        <div>
          <dt>Ljung–Box (p, 24 rezagos)</dt>
          <dd>{numero(validacion.ljung_box_p, 3)}</dd>
        </div>
      </dl>
      <p className="nota">
        Modelo: {validacion.modelo}. La proyección hacia los próximos meses está pendiente: requiere valores futuros de
        la variable El Niño.
      </p>
      <p className="fuente">Fuente: INE, Empalme del IPC por República. Pronóstico e intervalos: cálculo del equipo.</p>
    </section>
  );
}

function Departamental({ coeficientes, departamentos }: { coeficientes: Coeficientes; departamentos: Departamento[] }) {
  // Nombres con tildes desde el catálogo de departamentos, unidos por código.
  const filas = useMemo(() => {
    const nombres = new Map(departamentos.map((d) => [d.codigo, d.nombre]));
    return coeficientes.departamentos.map((d) => ({ ...d, nombre: nombres.get(d.codigo) ?? d.nombre }));
  }, [coeficientes, departamentos]);
  const dibujar = useCallback(
    (ancho: number) =>
      Plot.plot({
        width: ancho,
        height: 560,
        marginLeft: 120,
        marginBottom: 56,
        style: { fontFamily: "var(--ine-fuente)", fontSize: "13px" },
        x: { label: "Nivel de precios relativo (promedio de departamentos = 1)", grid: true, domain: [0.92, 1.06], labelOffset: 44, labelAnchor: "center" },
        y: { label: null },
        marks: [
          Plot.ruleX([1], { stroke: colorToken("--ine-gris-oscuro") }),
          Plot.dot(filas, {
            x: "coeficiente",
            y: "nombre",
            r: 5,
            fill: (d) => (d.coeficiente >= 1 ? colorToken("--ine-azul-oscuro") : colorToken("--ine-azul-radiante")),
            sort: { y: "x", reverse: true },
          }),
          Plot.tip(filas, Plot.pointerY({ x: "coeficiente", y: "nombre", title: (d) => `${d.nombre}: ${numero(d.coeficiente, 3)}\n${d.observaciones.toLocaleString("es-GT")} precios comparados` })),
        ],
      }),
    [filas],
  );

  return (
    <section className="bloque">
      <h2>Nivel de precios estimado por departamento</h2>
      <p className="etiqueta-estimacion">Estimación del equipo · No es una cifra oficial del INE</p>
      <p className="nota">
        El INE publica el IPC a nivel nacional y por región. Este coeficiente compara el precio del mismo artículo, en
        la misma presentación y el mismo mes entre departamentos, con los precios recolectados para el IPC en{" "}
        {coeficientes.anio_precios}. Un valor de 1.04 indica precios alrededor de 4 % por encima del promedio de los
        departamentos.
      </p>
      <Grafica dibujar={dibujar} etiqueta="Coeficiente de nivel de precios relativo por departamento" />
      <p className="fuente">
        Fuente: INE, Precios recolectados del IPC {coeficientes.anio_precios}. Coeficientes: cálculo del equipo.
      </p>
    </section>
  );
}
