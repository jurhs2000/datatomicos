import { useMemo, useState } from "react";
import { LineaDeTiempo } from "../componentes/LineaDeTiempo";
import { Mapa } from "../componentes/Mapa";
import { RUTAS } from "../navegacion";
import {
  NOMBRE_NIVEL,
  ORDEN_NIVEL,
  useJson,
  type Catalogo,
  type Departamento,
  type Publicacion,
} from "../datos";

const ENLACE_SECCION: Record<string, string> = { ipc: RUTAS.ipc.hash };

/** ¿La publicación tiene datos a nivel de departamento o más fino? */
function llegaADepartamento(p: Publicacion): boolean {
  return ORDEN_NIVEL.indexOf(p.nivel_territorial_minimo) >= ORDEN_NIVEL.indexOf("departamento");
}

export function Explorador() {
  const catalogo = useJson<Catalogo>("catalogo.json");
  const departamentos = useJson<Departamento[]>("territorio/departamentos.json");

  if (catalogo.cargando || departamentos.cargando) return <p>Cargando el catálogo…</p>;
  if ("error" in catalogo) return <p className="error">{catalogo.error}</p>;
  if ("error" in departamentos) return <p className="error">{departamentos.error}</p>;

  return <Buscador publicaciones={catalogo.datos.publicaciones} departamentos={departamentos.datos} />;
}

function Buscador({ publicaciones, departamentos }: { publicaciones: Publicacion[]; departamentos: Departamento[] }) {
  const minimo = Math.min(...publicaciones.map((p) => p.periodo_inicio));
  const maximo = Math.max(...publicaciones.map((p) => p.periodo_fin));
  const [periodo, setPeriodo] = useState({ desde: minimo, hasta: maximo });
  const [departamento, setDepartamento] = useState<number | null>(null);

  const nombreDepartamento = departamentos.find((d) => d.codigo === departamento)?.nombre;

  const { conDetalle, agregadas } = useMemo(() => {
    const enPeriodo = publicaciones.filter(
      (p) => p.periodo_inicio <= periodo.hasta && p.periodo_fin >= periodo.desde,
    );
    if (departamento === null) return { conDetalle: enPeriodo, agregadas: [] };
    return {
      conDetalle: enPeriodo.filter(llegaADepartamento),
      agregadas: enPeriodo.filter((p) => !llegaADepartamento(p)),
    };
  }, [publicaciones, periodo, departamento]);

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
          <legend>Territorio</legend>
          <select
            value={departamento ?? ""}
            onChange={(e) => setDepartamento(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todo el país</option>
            {departamentos.map((d) => (
              <option key={d.codigo} value={d.codigo}>
                {d.nombre}
              </option>
            ))}
          </select>
          <Mapa seleccionado={departamento} onSeleccion={setDepartamento} />
        </fieldset>
      </aside>

      <section className="resultados" aria-live="polite">
        <h1>
          {conDetalle.length + agregadas.length} publicaciones entre {periodo.desde} y {periodo.hasta}
          {nombreDepartamento && ` para ${nombreDepartamento}`}
        </h1>
        <Lista publicaciones={conDetalle} />
        {agregadas.length > 0 && (
          <>
            <h2>Con cobertura nacional o regional</h2>
            <p className="nota">Incluyen a {nombreDepartamento}, pero no publican cifras propias del departamento.</p>
            <Lista publicaciones={agregadas} />
          </>
        )}
      </section>
    </div>
  );
}

function Lista({ publicaciones }: { publicaciones: Publicacion[] }) {
  if (publicaciones.length === 0) return <p className="nota">Ninguna publicación coincide con los filtros.</p>;
  return (
    <ul className="lista-publicaciones">
      {publicaciones.map((p) => (
        <li key={p.id} className="publicacion ine-esquina-sm">
          <h3>
            <a href={p.url_publicacion} target="_blank" rel="noreferrer">
              {p.titulo}
            </a>
          </h3>
          <p className="publicacion-meta">{p.direccion_ine}</p>
          <dl className="publicacion-datos">
            <dt>Periodo</dt>
            <dd className="ine-num">
              {p.periodo_inicio === p.periodo_fin ? p.periodo_inicio : `${p.periodo_inicio}–${p.periodo_fin}`} ·{" "}
              {p.periodicidad}
            </dd>
            <dt>Nivel territorial</dt>
            <dd>{NOMBRE_NIVEL[p.nivel_territorial_minimo]}</dd>
            {p.base_metodologica && (
              <>
                <dt>Base</dt>
                <dd>{p.base_metodologica}</dd>
              </>
            )}
            <dt>Dónde está</dt>
            <dd>{p.en_ckan ? "Portal de datos abiertos" : "www.ine.gob.gt"}</dd>
          </dl>
          {p.datos && ENLACE_SECCION[p.datos] && (
            <a className="boton" href={ENLACE_SECCION[p.datos]}>
              Ver los datos en el sitio
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
