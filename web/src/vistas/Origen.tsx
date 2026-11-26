import { useEffect, useMemo, useState } from "react";
import { enlace, reemplazarParametros, useUbicacion } from "../navegacion";
import { useJson, type Catalogo, type Operacion, type Relacion } from "../datos";
import { NOMBRE_SIN_TEMA, NOMBRE_TIPO, TIPOS_OPERACION, indexar, nombreCorto, type Indice } from "../origen";

/** Operación que se abre por defecto: la que mejor muestra qué deriva de qué. */
const OPERACION_INICIAL = "enigh";

const NOMBRE_RELACION: Record<string, string> = {
  ponderadores: "ponderadores",
  estructura_de_consumo: "estructura de consumo",
  precios: "precios",
  marco_muestral: "marco muestral",
  diseno_muestral: "diseño muestral",
  poblacion_base: "población base",
  componentes_demograficos: "componentes demográficos",
  validacion: "validación",
  deflactor: "deflactor",
  registros: "registros",
  insumo: "insumo",
  metodologia: "metodología",
  sucede_a: "sucede a",
};

const TEXTO_PROBABLE = "Probable: el documento lo sugiere, pero no lo dice de forma explícita.";

export function Origen() {
  const catalogo = useJson<Catalogo>("catalogo.json");
  return (
    <div className="origen-datos">
      <h1>Origen de los datos</h1>
      <p className="bajada">
        Cada cifra del INE sale de una operación estadística: un censo, una encuesta, un índice o un registro. Aquí se
        ve cuáles hay y cuáles se alimentan de otras.
      </p>
      {catalogo.cargando ? (
        <p>Cargando el catálogo…</p>
      ) : "error" in catalogo ? (
        <p className="error">{catalogo.error}</p>
      ) : (
        <Operaciones catalogo={catalogo.datos} />
      )}
    </div>
  );
}

function Operaciones({ catalogo }: { catalogo: Catalogo }) {
  const indice = useMemo(() => indexar(catalogo), [catalogo]);
  const { parametros } = useUbicacion();
  const [elegida, setElegida] = useState(() => {
    const op = parametros.get("op");
    return op && indice.operaciones.has(op) ? op : OPERACION_INICIAL;
  });

  useEffect(() => reemplazarParametros({ op: elegida }), [elegida]);

  const edicionesPor = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const e of catalogo.ediciones) conteo.set(e.operacion, (conteo.get(e.operacion) ?? 0) + 1);
    return conteo;
  }, [catalogo]);

  const elegir = (id: string) => {
    setElegida(id);
    document.getElementById("operacion-detalle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="origen-cuerpo">
      <nav className="origen-lista" aria-label="Operaciones estadísticas por tipo">
        {TIPOS_OPERACION.map((tipo) => {
          const operaciones = catalogo.operaciones
            .filter((o) => o.tipo_operacion === tipo)
            .sort((a, b) => nombreCorto(a).localeCompare(nombreCorto(b), "es"));
          return (
            <section key={tipo}>
              <h2>
                {NOMBRE_TIPO[tipo].plural} <span className="origen-conteo">{operaciones.length}</span>
              </h2>
              <ul>
                {operaciones.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="origen-opcion"
                      aria-current={o.id === elegida ? "true" : undefined}
                      onClick={() => elegir(o.id)}
                    >
                      <span className="origen-opcion-nombre">{nombreCorto(o)}</span>
                      {o.siglas && <span className="origen-opcion-detalle">{o.nombre}</span>}
                      {(edicionesPor.get(o.id) ?? 0) > 0 && (
                        <span className="origen-opcion-detalle">
                          {edicionesPor.get(o.id)} {edicionesPor.get(o.id) === 1 ? "edición" : "ediciones"}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
      <Detalle catalogo={catalogo} indice={indice} operacion={indice.operaciones.get(elegida)!} onElegir={elegir} />
    </div>
  );
}

interface Vinculo {
  /** Operación del INE con la que se relaciona, o null si el insumo es externo. */
  operacion: Operacion | null;
  externo: string | null;
  relaciones: Relacion[];
}

/** Agrupa las relaciones por la operación (o institución) del otro lado. */
function agrupar(relaciones: Relacion[], otraOperacion: (r: Relacion) => string | null, indice: Indice): Vinculo[] {
  const grupos = new Map<string, Vinculo>();
  for (const r of relaciones) {
    const id = otraOperacion(r);
    const clave = id ?? `externo:${r.insumo_externo.join(", ")}`;
    if (!grupos.has(clave))
      grupos.set(clave, {
        operacion: id ? (indice.operaciones.get(id) ?? null) : null,
        externo: id ? null : r.insumo_externo.join(", "),
        relaciones: [],
      });
    grupos.get(clave)!.relaciones.push(r);
  }
  return [...grupos.values()];
}

interface PropsDetalle {
  catalogo: Catalogo;
  indice: Indice;
  operacion: Operacion;
  onElegir: (id: string) => void;
}

function Detalle({ catalogo, indice, operacion, onElegir }: PropsDetalle) {
  const ediciones = catalogo.ediciones
    .filter((e) => e.operacion === operacion.id)
    .sort((a, b) => a.anio_inicio - b.anio_inicio);
  const usa = agrupar(
    catalogo.relaciones.filter((r) => r.operacion === operacion.id),
    (r) => r.usa_insumo_de,
    indice,
  );
  const alimenta = agrupar(
    catalogo.relaciones.filter((r) => r.usa_insumo_de === operacion.id),
    (r) => r.operacion,
    indice,
  );
  const productos = catalogo.publicaciones.filter((p) => p.operacion === operacion.id).length;
  const tema = operacion.tema_portal ? indice.temas.get(operacion.tema_portal) : null;

  return (
    <article id="operacion-detalle" className="origen-detalle ine-esquina-sm" aria-live="polite">
      <p className="origen-tipo">{NOMBRE_TIPO[operacion.tipo_operacion].singular}</p>
      <h2>
        {operacion.siglas ? (
          <>
            {operacion.siglas} <span className="origen-nombre-completo">{operacion.nombre}</span>
          </>
        ) : (
          operacion.nombre
        )}
      </h2>

      <Cadena usa={usa} alimenta={alimenta} operacion={operacion} onElegir={onElegir} />

      <div className="origen-descripcion">
        <p>{operacion.descripcion}</p>
        <p className="fuente">
          {operacion.descripcion_origen === "ine" ? "Texto entre comillas tomado de " : "Resumen del equipo a partir de "}
          {operacion.url_descripcion ? (
            <a href={operacion.url_descripcion} target="_blank" rel="noreferrer">
              la página del INE
            </a>
          ) : (
            "la página del INE"
          )}
          .
        </p>
      </div>

      <dl className="producto-datos origen-datos-operacion">
        <dt>Tema del portal</dt>
        <dd>
          {tema ? (
            <a href={tema.url_portal} target="_blank" rel="noreferrer">
              {tema.nombre}
            </a>
          ) : (
            NOMBRE_SIN_TEMA
          )}
        </dd>
        {operacion.periodicidad && (
          <>
            <dt>Periodicidad</dt>
            <dd>{operacion.periodicidad}</dd>
          </>
        )}
        {operacion.direccion_ine && (
          <>
            <dt>Responsable</dt>
            <dd>{operacion.direccion_ine}</dd>
          </>
        )}
        {operacion.institucion_fuente && (
          <>
            <dt>Registros de</dt>
            <dd>{operacion.institucion_fuente}</dd>
          </>
        )}
        <dt>En el portal</dt>
        <dd>
          <a href={operacion.url_portal} target="_blank" rel="noreferrer">
            Página de la operación
          </a>
          {operacion.url_metodologia && (
            <>
              {" · "}
              <a href={operacion.url_metodologia} target="_blank" rel="noreferrer">
                Metodología
              </a>
            </>
          )}
        </dd>
      </dl>

      {productos > 0 && (
        <a className="boton" href={enlace("explorar", { op: operacion.id })}>
          {productos === 1 ? "Ver su producto en Explorar" : `Ver sus ${productos} productos en Explorar`}
        </a>
      )}

      <section className="origen-seccion">
        <h3>Ediciones</h3>
        {ediciones.length === 0 ? (
          <p className="nota">
            {operacion.tipo_operacion === "registro_administrativo"
              ? "Los registros administrativos no se organizan en ediciones: sus años están en el periodo de cada producto."
              : "No hay ediciones documentadas en el catálogo."}
          </p>
        ) : (
          <ul className="origen-ediciones">
            {ediciones.map((e) => (
              <li key={e.id}>
                <span className="ine-num">{e.anio_inicio === e.anio_fin ? e.anio_inicio : `${e.anio_inicio}–${e.anio_fin}`}</span>{" "}
                {e.url_portal ? (
                  <a href={e.url_portal} target="_blank" rel="noreferrer">
                    {e.nombre}
                  </a>
                ) : (
                  e.nombre
                )}
                {e.base_metodologica && !e.nombre.includes(e.base_metodologica) && (
                  <span className="nota"> · base {e.base_metodologica}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Vinculos titulo="Usa insumos de" vinculos={usa} indice={indice} onElegir={onElegir} />
      <Vinculos titulo="Alimenta a" vinculos={alimenta} indice={indice} onElegir={onElegir} />
    </article>
  );
}

/** Diagrama simple: de qué se alimenta la operación y qué alimenta. */
function Cadena({ usa, alimenta, operacion, onElegir }: { usa: Vinculo[]; alimenta: Vinculo[]; operacion: Operacion; onElegir: (id: string) => void }) {
  if (usa.length === 0 && alimenta.length === 0) return null;
  const Nodo = ({ v }: { v: Vinculo }) => {
    const probable = v.relaciones.every((r) => r.confianza !== "confirmado");
    const clase = `cadena-nodo${probable ? " cadena-nodo-probable" : ""}`;
    return v.operacion ? (
      <button type="button" className={clase} onClick={() => onElegir(v.operacion!.id)} title={probable ? TEXTO_PROBABLE : undefined}>
        {nombreCorto(v.operacion)}
      </button>
    ) : (
      <span className={`${clase} cadena-nodo-externo`}>{v.externo}</span>
    );
  };
  return (
    <div className="cadena" aria-label={`Qué usa y qué alimenta ${nombreCorto(operacion)}`}>
      <div className="cadena-columna">
        {usa.map((v, i) => (
          <Nodo key={i} v={v} />
        ))}
      </div>
      {usa.length > 0 && <span className="cadena-flecha" aria-hidden="true">→</span>}
      <div className="cadena-columna">
        <span className="cadena-nodo cadena-nodo-central">{nombreCorto(operacion)}</span>
      </div>
      {alimenta.length > 0 && <span className="cadena-flecha" aria-hidden="true">→</span>}
      <div className="cadena-columna">
        {alimenta.map((v, i) => (
          <Nodo key={i} v={v} />
        ))}
      </div>
    </div>
  );
}

function Vinculos({ titulo, vinculos, indice, onElegir }: { titulo: string; vinculos: Vinculo[]; indice: Indice; onElegir: (id: string) => void }) {
  return (
    <section className="origen-seccion">
      <h3>{titulo}</h3>
      {vinculos.length === 0 ? (
        <p className="nota">No hay relaciones documentadas en el catálogo.</p>
      ) : (
        <ul className="origen-vinculos">
          {vinculos.map((v, i) => (
            <li key={i}>
              <p className="origen-vinculo-nombre">
                {v.operacion ? (
                  <button type="button" className="boton-texto" onClick={() => onElegir(v.operacion!.id)}>
                    {nombreCorto(v.operacion)}
                    {v.operacion.siglas && ` · ${v.operacion.nombre}`}
                  </button>
                ) : (
                  <span>{v.externo} <span className="nota">(fuera del INE)</span></span>
                )}
              </p>
              <ul>
                {v.relaciones.map((r) => {
                  const edicion = r.edicion ? indice.ediciones.get(r.edicion)?.nombre : null;
                  const edicionInsumo = r.edicion_insumo ? indice.ediciones.get(r.edicion_insumo)?.nombre : null;
                  const detalle = [edicion, edicionInsumo && `con ${edicionInsumo}`].filter(Boolean).join(", ");
                  return (
                    <li key={r.id} className={r.confianza === "probable" ? "origen-relacion probable" : "origen-relacion"}>
                      <span className="origen-relacion-tipo">{NOMBRE_RELACION[r.tipo_relacion] ?? r.tipo_relacion}</span>
                      {detalle && <span className="nota"> · {detalle}</span>}
                      <p>{r.descripcion}</p>
                      {r.confianza === "probable" && <p className="origen-probable">{TEXTO_PROBABLE}</p>}
                      <p className="fuente">
                        Respaldo:{" "}
                        <a href={r.url_respaldo} target="_blank" rel="noreferrer">
                          {r.url_respaldo.toLowerCase().endsWith(".pdf") ? "documento del INE" : "página del INE"}
                        </a>
                        {r.pagina && `, p. ${r.pagina} del PDF`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
