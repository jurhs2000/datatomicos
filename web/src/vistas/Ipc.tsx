import { useCallback, useEffect, useMemo, useState } from "react";
import * as Plot from "@observablehq/plot";
import { Grafica } from "../componentes/Grafica";
import { colorToken } from "../componentes/colores";
import { reemplazarParametros, useUbicacion } from "../navegacion";
import { useJson, type Coeficientes, type Departamento, type PuntoSerie, type Validacion } from "../datos";
import { proyectar, type MesProyectado, type Pronostico } from "../proyeccionIpc";

// Fechas en UTC, igual que las escala Observable Plot, para que enero no se vea como diciembre.
const fecha = (texto: string) => new Date(`${texto}T00:00:00Z`);
const mesCorto = (d: Date) =>
  d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : d.toLocaleDateString("es-GT", { month: "short", timeZone: "UTC" }).replace(".", "");
const mesAnio = (texto: string) =>
  fecha(texto).toLocaleDateString("es-GT", { month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "");
const numero = (valor: number, decimales = 2) =>
  valor.toLocaleString("es-GT", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const HORIZONTE_INICIAL = 12;

export function Ipc() {
  const serie = useJson<PuntoSerie[]>("ipc/serie.json");
  const validacion = useJson<Validacion>("ipc/validacion.json");
  const coeficientes = useJson<Coeficientes>("ipc/coeficientes.json");
  const pronostico = useJson<Pronostico>("ipc/pronostico.json");
  const departamentos = useJson<Departamento[]>("territorio/departamentos.json");

  if (serie.cargando || validacion.cargando || coeficientes.cargando || pronostico.cargando || departamentos.cargando)
    return <p>Cargando el IPC…</p>;
  for (const estado of [serie, validacion, coeficientes, pronostico, departamentos])
    if ("error" in estado) return <p className="error">{estado.error}</p>;
  if (!("datos" in serie && "datos" in validacion && "datos" in coeficientes && "datos" in pronostico && "datos" in departamentos))
    return null;

  return (
    <div className="ipc">
      <h1>Calculadora del IPC</h1>
      <p className="bajada">
        Proyecta el Índice de Precios al Consumidor hasta 24 meses y elige si esperas un fenómeno de El Niño.
      </p>
      <Calculadora
        serie={serie.datos}
        pronostico={pronostico.datos}
        coeficientes={coeficientes.datos}
        departamentos={departamentos.datos}
      />
      <Origen />
      <Validado serie={serie.datos} validacion={validacion.datos} />
      <Departamental coeficientes={coeficientes.datos} departamentos={departamentos.datos} />
    </div>
  );
}

interface PropsCalculadora {
  serie: PuntoSerie[];
  pronostico: Pronostico;
  coeficientes: Coeficientes;
  departamentos: Departamento[];
}

function Calculadora({ serie, pronostico, coeficientes, departamentos }: PropsCalculadora) {
  const { parametros } = useUbicacion();
  const maximo = pronostico.meses.length;

  // Departamentos con coeficiente, con el nombre con tildes del catálogo.
  const opciones = useMemo(() => {
    const nombres = new Map(departamentos.map((d) => [d.codigo, d.nombre]));
    return coeficientes.departamentos
      .map((d) => ({ codigo: d.codigo, nombre: nombres.get(d.codigo) ?? d.nombre, coeficiente: d.coeficiente }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [coeficientes, departamentos]);

  const [depto, setDepto] = useState<number | null>(() => {
    const codigo = Number(parametros.get("depto"));
    return opciones.some((o) => o.codigo === codigo) ? codigo : null;
  });
  const [horizonte, setHorizonte] = useState(() => {
    const meses = Number(parametros.get("meses"));
    return Number.isInteger(meses) && meses >= 1 && meses <= maximo ? meses : HORIZONTE_INICIAL;
  });
  const [nino, setNino] = useState<Set<number>>(
    () => new Set((parametros.get("nino") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= maximo)),
  );

  useEffect(() => {
    const ninoEnHorizonte = [...nino].filter((n) => n <= horizonte).sort((a, b) => a - b);
    reemplazarParametros({ depto, meses: horizonte, nino: ninoEnHorizonte.join(",") });
  }, [depto, horizonte, nino]);

  const elegido = opciones.find((o) => o.codigo === depto) ?? null;
  const nacional = useMemo(() => proyectar(pronostico, horizonte, nino), [pronostico, horizonte, nino]);
  const ajustado = useMemo(
    () => (elegido ? proyectar(pronostico, horizonte, nino, elegido.coeficiente) : null),
    [pronostico, horizonte, nino, elegido],
  );
  const final = (ajustado ?? nacional)[horizonte - 1];

  const alternarNino = (periodo: number) =>
    setNino((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(periodo)) nuevo.delete(periodo);
      else nuevo.add(periodo);
      return nuevo;
    });

  return (
    <section className="calculadora">
      <div className="calculadora-controles">
        <label className="control">
          <span>Horizonte</span>
          <input
            type="range"
            min={1}
            max={maximo}
            value={horizonte}
            onChange={(e) => setHorizonte(Number(e.target.value))}
          />
          <span className="control-valor ine-num">
            {horizonte} {horizonte === 1 ? "mes" : "meses"}
          </span>
        </label>
        <label className="control">
          <span>Departamento</span>
          <select value={depto ?? ""} onChange={(e) => setDepto(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Todo el país</option>
            {opciones.map((o) => (
              <option key={o.codigo} value={o.codigo}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="control control-nino">
          <legend>¿En qué meses esperas El Niño?</legend>
          <div className="meses-nino">
            {pronostico.meses.slice(0, horizonte).map((m, i) => (
              <label key={m.fecha} className={nino.has(i + 1) ? "mes-nino activo" : "mes-nino"}>
                <input type="checkbox" checked={nino.has(i + 1)} onChange={() => alternarNino(i + 1)} />
                {mesAnio(m.fecha)}
              </label>
            ))}
          </div>
          {nino.size > 0 && (
            <button type="button" className="boton-texto" onClick={() => setNino(new Set())}>
              Quitar El Niño de todos los meses
            </button>
          )}
        </fieldset>
      </div>

      <div className="calculadora-resultado">
        <p className="etiqueta-estimacion">
          {elegido
            ? `IPC nacional ajustado al nivel de precios de ${elegido.nombre} · estimación del equipo`
            : "IPC nacional proyectado · estimación del equipo"}
        </p>
        <p className="resultado-cifra ine-num">
          <strong>{numero(final.pronostico)}</strong> en {mesAnio(final.fecha)}
        </p>
        <p className="nota ine-num">
          Intervalo de 95 %: {numero(final.inferior_95)} a {numero(final.superior_95)}. Último dato publicado por el
          INE: {numero(serie.at(-1)!.ipc)} en {mesAnio(serie.at(-1)!.fecha)}.
        </p>
        {elegido && (
          <p className="nota">
            Todos los departamentos siguen la variación nacional; el ajuste usa el nivel de precios relativo de{" "}
            {coeficientes.anio_precios}. El INE publica el IPC por región.
          </p>
        )}
        <GraficaProyeccion serie={serie} proyeccion={nacional} />
        <TablaProyeccion nacional={nacional} ajustado={ajustado} nombre={elegido?.nombre ?? null} />
        <p className="nota">
          En el modelo, un mes con El Niño eleva el IPC de ese mes en {numero(pronostico.el_nino.efecto_porcentual)} %;
          los demás meses no cambian.
        </p>
      </div>
    </section>
  );
}

function GraficaProyeccion({ serie, proyeccion }: { serie: PuntoSerie[]; proyeccion: MesProyectado[] }) {
  const dibujar = useCallback(
    (ancho: number) => {
      const historia = serie.slice(-36).map((p) => ({ fecha: fecha(p.fecha), ipc: p.ipc }));
      const ultimo = historia.at(-1)!;
      // El tramo proyectado arranca en el último dato publicado para que la línea no quede suelta.
      const meses = [
        { fecha: ultimo.fecha, pronostico: ultimo.ipc, inferior_80: ultimo.ipc, superior_80: ultimo.ipc, inferior_95: ultimo.ipc, superior_95: ultimo.ipc, nino: false },
        ...proyeccion.map((m) => ({ ...m, fecha: fecha(m.fecha) })),
      ];
      return Plot.plot({
        width: ancho,
        height: 340,
        marginLeft: 48,
        marginBottom: 32,
        style: { fontFamily: "var(--ine-fuente)", fontSize: "13px" },
        x: { label: null, tickFormat: mesCorto },
        y: { label: "IPC (base 2024 = 100)", grid: true },
        marks: [
          Plot.areaY(meses, { x: "fecha", y1: "inferior_95", y2: "superior_95", fill: colorToken("--ine-serie-2"), fillOpacity: 0.12 }),
          Plot.areaY(meses, { x: "fecha", y1: "inferior_80", y2: "superior_80", fill: colorToken("--ine-serie-2"), fillOpacity: 0.22 }),
          Plot.ruleX([ultimo.fecha], { stroke: colorToken("--ine-gris"), strokeDasharray: "4 4" }),
          Plot.lineY(historia, { x: "fecha", y: "ipc", stroke: colorToken("--ine-serie-1"), strokeWidth: 2 }),
          Plot.lineY(meses, { x: "fecha", y: "pronostico", stroke: colorToken("--ine-serie-2"), strokeWidth: 2, strokeDasharray: "6 3" }),
          Plot.dot(meses.filter((m) => m.nino), { x: "fecha", y: "pronostico", r: 4, fill: colorToken("--ine-naranja-oscuro") }),
          Plot.text([{ x: ultimo.fecha }], { x: "x", frameAnchor: "top", dx: 6, textAnchor: "start", text: () => "Proyección", fill: colorToken("--ine-gris-oscuro") }),
          Plot.tip(meses.slice(1), Plot.pointerX({ x: "fecha", y: "pronostico", title: (m) => `Proyección: ${numero(m.pronostico)}\n95 %: ${numero(m.inferior_95)} a ${numero(m.superior_95)}${m.nino ? "\nCon El Niño" : ""}` })),
        ],
      });
    },
    [serie, proyeccion],
  );

  return (
    <>
      <div className="leyenda">
        <span className="leyenda-oficial">IPC publicado por el INE</span>
        <span className="leyenda-estimado">IPC nacional proyectado por el equipo, con intervalos de 80 % y 95 %</span>
        <span className="leyenda-nino">Mes con El Niño</span>
      </div>
      <Grafica dibujar={dibujar} etiqueta="IPC publicado y proyección nacional del equipo" />
    </>
  );
}

function TablaProyeccion({ nacional, ajustado, nombre }: { nacional: MesProyectado[]; ajustado: MesProyectado[] | null; nombre: string | null }) {
  const filas = ajustado ?? nacional;
  return (
    <details className="tabla-proyeccion">
      <summary>Ver la proyección mes a mes</summary>
      <table className="ine-num">
        <thead>
          <tr>
            <th>Mes</th>
            <th>El Niño</th>
            <th>IPC nacional</th>
            {nombre && <th>Ajustado a {nombre}</th>}
            <th>Intervalo de 95 %</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((m, i) => (
            <tr key={m.fecha}>
              <td>{mesAnio(m.fecha)}</td>
              <td>{m.nino ? "Sí" : "No"}</td>
              <td>{numero(nacional[i].pronostico)}</td>
              {nombre && <td>{numero(m.pronostico)}</td>}
              <td>
                {numero(m.inferior_95)} a {numero(m.superior_95)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function Origen() {
  return (
    <section className="bloque origen ine-esquina-sm">
      <h2>De dónde sale</h2>
      <p>
        IPC del INE, base 2024=100. Sus ponderadores vienen de la ENIGH y sus puntos de recolección de precios, del
        DINESE. La proyección y el ajuste departamental son del equipo.
      </p>
      <p className="fuente">
        <a href="https://www.ine.gob.gt/indice-de-precios-al-consumidor/" target="_blank" rel="noreferrer">
          IPC en www.ine.gob.gt
        </a>{" "}
        ·{" "}
        <a
          href="https://datos.ine.gob.gt/dataset/ipc-por-producto-ano-2024-100-0/resource/6b2cb40a-188c-47c9-9288-ba11c40b5910"
          target="_blank"
          rel="noreferrer"
        >
          Empalme del IPC por República
        </a>
      </p>
    </section>
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
        height: 300,
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
        Para medir su acierto, el modelo se entrenó con datos hasta {validacion.entrenamiento.fin.slice(0, 7)} y se
        comparó con lo observado de {validacion.prueba.inicio.slice(0, 7)} a {validacion.prueba.fin.slice(0, 7)},
        meses que no vio al ajustarse. La calculadora usa el mismo modelo, reajustado con los datos hasta el último mes
        publicado.
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
      <p className="nota">Modelo: {validacion.modelo}.</p>
      <p className="fuente">
        Fuente: INE, Empalme del IPC por República; NOAA–CPC, Oceanic Niño Index (El Niño). Pronóstico e intervalos:
        cálculo del equipo.
      </p>
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
        departamentos. Es el factor que la calculadora aplica al IPC nacional.
      </p>
      <Grafica dibujar={dibujar} etiqueta="Coeficiente de nivel de precios relativo por departamento" />
      <p className="fuente">
        Fuente: INE, Precios recolectados del IPC {coeficientes.anio_precios}. Coeficientes: cálculo del equipo.
      </p>
    </section>
  );
}
