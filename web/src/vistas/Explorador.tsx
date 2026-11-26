import { useEffect, useMemo, useState } from "react";
import { LineaDeTiempo } from "../componentes/LineaDeTiempo";
import { Mapa } from "../componentes/Mapa";
import type { Origen } from "../componentes/TarjetaCifra";
import { TarjetaPoblacion } from "../componentes/TarjetaPoblacion";
import { TarjetaPrecios } from "../componentes/TarjetaPrecios";
import { enlace, reemplazarParametros, useUbicacion } from "../navegacion";
import { useMunicipios } from "../territorio";
import {
  NOMBRE_NIVEL,
  llegaADepartamento,
  nombreLugar,
  textoPeriodo,
  useJson,
  type Catalogo,
  type Departamento,
  type Lugar,
  type NivelTerritorial,
  type Poblacion,
  type Publicacion,
  type TipoOperacion,
} from "../datos";
import {
  NOMBRE_PROCESAMIENTO,
  NOMBRE_SIN_TEMA,
  NOMBRE_TIPO,
  SIN_TEMA,
  TIPOS_OPERACION,
  indexar,
  nombreCorto,
  temaDe,
  textoOrigen,
  type Indice,
} from "../origen";

/** Línea de valor de la portada. Provisional: se cambia aquí. */
const LINEA_DE_VALOR = "Elige un lugar y un periodo para ver lo que el INE sabe de él y de dónde sale cada cifra.";

export function Explorador() {
  const catalogo = useJson<Catalogo>("catalogo.json");
  const departamentos = useJson<Departamento[]>("territorio/departamentos.json");
  const poblacion = useJson<Poblacion>("poblacion/proyecciones.json");

  return (
    <>
      <section className="portada ine-esquina">
        <h1>Atlas INE</h1>
        <p className="portada-subtitulo">Guatemala en datos</p>
        <p className="portada-valor">{LINEA_DE_VALOR}</p>
      </section>
      {catalogo.cargando || departamentos.cargando || poblacion.cargando ? (
        <p>Cargando el catálogo…</p>
      ) : "error" in catalogo ? (
        <p className="error">{catalogo.error}</p>
      ) : "error" in departamentos ? (
        <p className="error">{departamentos.error}</p>
      ) : (
        <Buscador
          catalogo={catalogo.datos}
          departamentos={departamentos.datos}
          poblacion={"datos" in poblacion ? poblacion.datos : null}
        />
      )}
    </>
  );
}

interface PropsBuscador {
  catalogo: Catalogo;
  departamentos: Departamento[];
  poblacion: Poblacion | null;
}

/** Lee un número entero de la URL, o null si no está o no es válido. */
function entero(parametros: URLSearchParams, clave: string): number | null {
  const valor = Number(parametros.get(clave));
  return parametros.has(clave) && Number.isInteger(valor) ? valor : null;
}

/** El origen de una tarjeta de «En cifras»: la operación y la edición del producto que la alimenta. */
function origenDeProducto(indice: Indice, producto: Publicacion | undefined, sufijo: string): Origen | undefined {
  return producto ? { texto: `${textoOrigen(indice, producto)} · ${sufijo}`, url: producto.url_publicacion } : undefined;
}

function Buscador({ catalogo, departamentos, poblacion }: PropsBuscador) {
  const productos = catalogo.publicaciones;
  const indice = useMemo(() => indexar(catalogo), [catalogo]);
  const { parametros } = useUbicacion();
  const minimo = Math.min(...productos.map((p) => p.periodo_inicio));
  const maximo = Math.max(...productos.map((p) => p.periodo_fin));
  // Por defecto, la última década hasta el año actual; el usuario puede abrir el rango completo.
  const hoy = Math.min(maximo, new Date().getFullYear());

  // El estado inicial sale de la URL, para que un enlace abra la misma consulta.
  const [periodo, setPeriodo] = useState(() => {
    const desde = entero(parametros, "desde");
    const hasta = entero(parametros, "hasta");
    const d = desde !== null && desde >= minimo && desde <= maximo ? desde : Math.max(minimo, hoy - 10);
    const h = hasta !== null && hasta >= d && hasta <= maximo ? hasta : Math.max(d, hoy);
    return { desde: d, hasta: h };
  });
  const [departamento, setDepartamento] = useState<number | null>(() => {
    const codigo = entero(parametros, "depto");
    return departamentos.some((d) => d.codigo === codigo) ? codigo : null;
  });
  const [municipioElegido, setMunicipio] = useState<number | null>(() => entero(parametros, "muni"));
  const municipios = useMunicipios(departamento);
  // Al cambiar de departamento se borra el municipio elegido.
  const elegirDepartamento = (codigo: number | null) => {
    setDepartamento(codigo);
    setMunicipio(null);
  };
  // Un municipio de la URL que no es de este departamento se ignora.
  const municipio = municipios?.find((m) => m.codigo === municipioElegido) ?? null;

  const [tema, setTema] = useState<string | null>(() => {
    const t = parametros.get("tema");
    return t === SIN_TEMA || (t && indice.temas.has(t)) ? t : null;
  });
  const [operacion, setOperacion] = useState<string | null>(() => {
    const o = parametros.get("op");
    return o && indice.operaciones.has(o) ? o : null;
  });
  const [tipo, setTipo] = useState<TipoOperacion | null>(() => {
    if (operacion) return indice.operaciones.get(operacion)!.tipo_operacion;
    const t = parametros.get("tipo") as TipoOperacion | null;
    return t && TIPOS_OPERACION.includes(t) ? t : null;
  });

  useEffect(() => {
    reemplazarParametros({
      depto: departamento,
      // Mientras carga la lista de municipios se conserva el de la URL.
      muni: municipios ? (municipio?.codigo ?? null) : municipioElegido,
      desde: periodo.desde,
      hasta: periodo.hasta,
      tema,
      tipo: operacion ? null : tipo,
      op: operacion,
    });
  }, [departamento, municipios, municipio, municipioElegido, periodo, tema, tipo, operacion]);

  const lugar = useMemo<Lugar>(() => {
    const d = departamentos.find((x) => x.codigo === departamento);
    if (!d) return { nivel: "pais" };
    if (municipio) return { nivel: "municipio", codigo: municipio.codigo, nombre: municipio.nombre, departamento: d };
    return { nivel: "departamento", codigo: d.codigo, nombre: d.nombre };
  }, [departamentos, departamento, municipio]);

  // Filtros en cascada. Los conteos de cada lista usan los demás filtros, no el propio.
  const enPeriodo = useMemo(
    () => productos.filter((p) => p.periodo_inicio <= periodo.hasta && p.periodo_fin >= periodo.desde),
    [productos, periodo],
  );
  const pasaTema = (p: Publicacion) => tema === null || temaDe(p) === tema;
  const pasaOrigen = (p: Publicacion) =>
    operacion !== null ? p.operacion === operacion : tipo === null || p.tipo_operacion === tipo;
  const filtrados = enPeriodo.filter((p) => pasaTema(p) && pasaOrigen(p));

  const contar = (lista: Publicacion[], clave: (p: Publicacion) => string) => {
    const conteo = new Map<string, number>();
    for (const p of lista) conteo.set(clave(p), (conteo.get(clave(p)) ?? 0) + 1);
    return conteo;
  };
  const porTema = contar(enPeriodo.filter(pasaOrigen), temaDe);
  const porTipo = contar(enPeriodo.filter(pasaTema), (p) => p.tipo_operacion);
  const porOperacion = contar(enPeriodo.filter(pasaTema), (p) => p.operacion);
  const operacionesDelTipo = tipo
    ? catalogo.operaciones
        .filter((o) => o.tipo_operacion === tipo)
        .sort((a, b) => nombreCorto(a).localeCompare(nombreCorto(b), "es"))
    : [];

  // Primero los que tienen cifras en el Atlas; después, los más recientes.
  const ordenados = [...filtrados].sort(
    (a, b) => Number(!!b.datos) - Number(!!a.datos) || b.periodo_fin - a.periodo_fin,
  );
  const esNivel = (...niveles: NivelTerritorial[]) => (p: Publicacion) => niveles.includes(p.nivel_territorial_minimo);
  const grupos =
    lugar.nivel === "pais"
      ? { principales: ordenados, departamentales: [], agregados: [], porConfirmar: [] }
      : lugar.nivel === "departamento"
        ? {
            principales: ordenados.filter((p) => llegaADepartamento(p.nivel_territorial_minimo)),
            departamentales: [],
            agregados: ordenados.filter(esNivel("nacional", "region")),
            porConfirmar: ordenados.filter(esNivel("sin_determinar")),
          }
        : {
            principales: ordenados.filter(esNivel("municipio", "lugar_poblado")),
            departamentales: ordenados.filter(esNivel("departamento")),
            agregados: ordenados.filter(esNivel("nacional", "region")),
            porConfirmar: ordenados.filter(esNivel("sin_determinar")),
          };
  const nombreDepartamento = lugar.nivel === "municipio" ? lugar.departamento.nombre : nombreLugar(lugar);

  const total = filtrados.length;
  const nombre = nombreLugar(lugar);
  const periodoTexto = textoPeriodo(periodo.desde, periodo.hasta);
  const deptoParaEnlaces = departamento;
  const hayFiltros = tema !== null || tipo !== null;

  // Origen de las tarjetas: el producto del catálogo que las alimenta.
  const origenPoblacion = origenDeProducto(indice, productos.find((p) => p.datos === "poblacion"), "INE");
  const ultimaBaseIpc = catalogo.ediciones
    .filter((e) => e.operacion === "ipc")
    .sort((a, b) => b.anio_fin - a.anio_fin)[0]?.id;
  const origenPrecios = origenDeProducto(
    indice,
    productos.find((p) => p.datos === "ipc" && ultimaBaseIpc && p.ediciones.includes(ultimaBaseIpc)),
    "proyección y ajuste del equipo",
  );

  const descripcionFiltros = [
    tema && (tema === SIN_TEMA ? NOMBRE_SIN_TEMA : indice.temas.get(tema)?.nombre),
    operacion ? nombreCorto(indice.operaciones.get(operacion)!) : tipo && NOMBRE_TIPO[tipo].plural,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="explorador">
      <aside className="filtros">
        <LineaDeTiempo
          minimo={minimo}
          maximo={maximo}
          desde={periodo.desde}
          hasta={periodo.hasta}
          onCambio={(desde, hasta) => setPeriodo({ desde, hasta })}
        />
        <fieldset>
          <legend>Lugar</legend>
          <select
            aria-label="Departamento"
            value={departamento ?? ""}
            onChange={(e) => elegirDepartamento(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todo el país</option>
            {departamentos.map((d) => (
              <option key={d.codigo} value={d.codigo}>
                {d.nombre}
              </option>
            ))}
          </select>
          <Mapa
            capa="departamentos"
            seleccionado={departamento}
            onSeleccion={elegirDepartamento}
            etiqueta="Mapa de departamentos de Guatemala"
          />
          {departamento !== null && (
            <div className="lugar-municipio">
              <select
                aria-label="Municipio"
                value={municipio?.codigo ?? ""}
                onChange={(e) => setMunicipio(e.target.value ? Number(e.target.value) : null)}
                disabled={!municipios}
              >
                <option value="">{municipios ? "Todo el departamento" : "Cargando municipios…"}</option>
                {municipios?.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </select>
              <Mapa
                key={departamento}
                capa="municipios"
                departamento={departamento}
                seleccionado={municipio?.codigo ?? null}
                onSeleccion={setMunicipio}
                etiqueta={`Mapa de los municipios de ${nombreDepartamento}`}
              />
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend>Tema</legend>
          <select aria-label="Tema del portal del INE" value={tema ?? ""} onChange={(e) => setTema(e.target.value || null)}>
            <option value="">Todos los temas</option>
            {catalogo.temas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} ({porTema.get(t.id) ?? 0})
              </option>
            ))}
            <option value={SIN_TEMA}>
              {NOMBRE_SIN_TEMA} ({porTema.get(SIN_TEMA) ?? 0})
            </option>
          </select>
          <p className="nota filtro-nota">Los temas de «Estadísticas por tema» del portal del INE.</p>
        </fieldset>
        <fieldset>
          <legend>Origen</legend>
          <select
            aria-label="Tipo de operación estadística"
            value={tipo ?? ""}
            onChange={(e) => {
              setTipo((e.target.value || null) as TipoOperacion | null);
              setOperacion(null);
            }}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_OPERACION.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_TIPO[t].plural} ({porTipo.get(t) ?? 0})
              </option>
            ))}
          </select>
          {tipo && (
            <select
              aria-label="Operación estadística"
              value={operacion ?? ""}
              onChange={(e) => setOperacion(e.target.value || null)}
            >
              <option value="">Todas: {NOMBRE_TIPO[tipo].plural.toLowerCase()}</option>
              {operacionesDelTipo.map((o) => (
                <option key={o.id} value={o.id}>
                  {nombreCorto(o)} ({porOperacion.get(o.id) ?? 0})
                </option>
              ))}
            </select>
          )}
          <p className="nota filtro-nota">De qué censo, encuesta, índice, registro o estimación sale cada producto.</p>
        </fieldset>
      </aside>

      <article className="ficha" aria-live="polite">
        <h2 className="ficha-titulo">
          {nombre}, <span className="ine-num sin-corte">{periodoTexto}</span>
        </h2>

        <section className="ficha-seccion">
          <h3>En cifras</h3>
          <div className="cifras">
            {poblacion && (
              <TarjetaPoblacion
                poblacion={poblacion}
                lugar={lugar}
                desde={periodo.desde}
                hasta={periodo.hasta}
                origen={origenPoblacion}
              />
            )}
            {lugar.nivel !== "pais" && (
              <TarjetaPrecios
                departamento={lugar.nivel === "municipio" ? lugar.departamento.codigo : lugar.codigo}
                nombre={lugar.nivel === "municipio" ? lugar.departamento.nombre : lugar.nombre}
                municipio={lugar.nivel === "municipio" ? lugar.nombre : undefined}
                origen={origenPrecios}
              />
            )}
          </div>
        </section>

        <section className="ficha-seccion">
          <h3>Lo que hay del INE</h3>
          <p className="conteo">
            <strong className="ine-num">{total}</strong> {total === 1 ? "producto" : "productos"} del INE para{" "}
            {lugar.nivel === "pais" ? "todo el país" : nombre}, {periodoTexto}
          </p>
          {hayFiltros && (
            <p className="filtros-activos">
              Filtrado por {descripcionFiltros}.{" "}
              <button
                type="button"
                className="boton-texto"
                onClick={() => {
                  setTema(null);
                  setTipo(null);
                  setOperacion(null);
                }}
              >
                Quitar filtros
              </button>
            </p>
          )}
          {lugar.nivel !== "pais" && (
            <>
              <h4 className="grupo-titulo">Con cifras de {lugar.nombre}</h4>
              <p className="nota">
                {grupos.principales.length} publican cifras a nivel de{" "}
                {lugar.nivel === "municipio" ? "municipio" : "departamento"} o más detallado.
              </p>
            </>
          )}
          <Lista productos={grupos.principales} depto={deptoParaEnlaces} indice={indice} />
          {grupos.departamentales.length > 0 && (
            <>
              <h4 className="grupo-titulo">Con cifras solo de {nombreDepartamento}</h4>
              <p className="nota">Publican cifras del departamento, pero no de cada municipio.</p>
              <Lista productos={grupos.departamentales} depto={deptoParaEnlaces} indice={indice} />
            </>
          )}
          {grupos.agregados.length > 0 && (
            <>
              <h4 className="grupo-titulo">Con cobertura nacional o regional</h4>
              <p className="nota">
                Incluyen a {lugar.nivel === "pais" ? "todo el país" : lugar.nombre}, pero no publican cifras propias
                del {lugar.nivel === "municipio" ? "municipio" : "departamento"}.
              </p>
              <Lista productos={grupos.agregados} depto={deptoParaEnlaces} indice={indice} />
            </>
          )}
          {grupos.porConfirmar.length > 0 && (
            <>
              <h4 className="grupo-titulo">Nivel territorial por confirmar</h4>
              <p className="nota">
                Todavía no se revisó si estos productos traen cifras por{" "}
                {lugar.nivel === "municipio" ? "municipio" : "departamento"}.
              </p>
              <Lista productos={grupos.porConfirmar} depto={deptoParaEnlaces} indice={indice} />
            </>
          )}
        </section>
      </article>
    </div>
  );
}

function Lista({ productos, depto, indice }: { productos: Publicacion[]; depto: number | null; indice: Indice }) {
  if (productos.length === 0) return <p className="nota">Ningún producto coincide con los filtros.</p>;
  return (
    <ul className="lista-productos">
      {productos.map((p) => {
        const operacion = indice.operaciones.get(p.operacion);
        return (
          <li key={p.id} className="producto ine-esquina-sm">
            <h5>
              <a href={p.url_publicacion} target="_blank" rel="noreferrer">
                {p.titulo}
              </a>
            </h5>
            {p.direccion_ine && <p className="producto-meta">{p.direccion_ine}</p>}
            <dl className="producto-datos">
              <dt>Origen</dt>
              <dd>
                {textoOrigen(indice, p)}
                {operacion && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={operacion.url_portal} target="_blank" rel="noreferrer">
                      {NOMBRE_TIPO[operacion.tipo_operacion].singular.toLowerCase()} en el portal
                    </a>
                  </>
                )}
              </dd>
              <dt>Periodo</dt>
              <dd className="ine-num">
                {textoPeriodo(p.periodo_inicio, p.periodo_fin)}
                {p.periodicidad && ` · ${p.periodicidad}`}
              </dd>
              <dt>Nivel territorial</dt>
              <dd>{NOMBRE_NIVEL[p.nivel_territorial_minimo]}</dd>
              {p.nivel_procesamiento.length > 0 && (
                <>
                  <dt>Contenido</dt>
                  <dd>
                    {p.nivel_procesamiento.map((n) => NOMBRE_PROCESAMIENTO[n]).join(" · ")}
                    {p.nivel_determinado_por === "supuesto" && " (por confirmar)"}
                  </dd>
                </>
              )}
              {p.base_metodologica && (
                <>
                  <dt>Base</dt>
                  <dd>{p.base_metodologica}</dd>
                </>
              )}
              <dt>Dónde está</dt>
              <dd>{p.en_ckan ? "Portal de datos abiertos" : "www.ine.gob.gt"}</dd>
            </dl>
            {p.como_se_determino === "supuesto" && (
              <p className="aviso-supuesto">El periodo o el nivel territorial se infirieron y falta verificarlos.</p>
            )}
            {p.datos === "poblacion" && <p className="nota">Sus cifras están arriba, en «En cifras».</p>}
            {p.datos === "ipc" && (
              <a className="boton" href={enlace("calculadora", { depto })}>
                Abrir en la calculadora del IPC
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
