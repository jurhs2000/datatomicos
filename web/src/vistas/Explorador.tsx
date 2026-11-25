import { useMemo, useState } from "react";
import { LineaDeTiempo } from "../componentes/LineaDeTiempo";
import { Mapa } from "../componentes/Mapa";
import { PanelPoblacion } from "../componentes/PanelPoblacion";
import { RUTAS } from "../navegacion";
import {
  NOMBRE_NIVEL,
  llegaADepartamento,
  useJson,
  type Catalogo,
  type Departamento,
  type Poblacion,
  type Publicacion,
} from "../datos";

const ENLACE_SECCION: Record<string, string> = { ipc: RUTAS.ipc.hash };

export function Explorador() {
  const catalogo = useJson<Catalogo>("catalogo.json");
  const departamentos = useJson<Departamento[]>("territorio/departamentos.json");
  const poblacion = useJson<Poblacion>("poblacion/proyecciones.json");

  if (catalogo.cargando || departamentos.cargando || poblacion.cargando) return <p>Cargando el catálogo…</p>;
  if ("error" in catalogo) return <p className="error">{catalogo.error}</p>;
  if ("error" in departamentos) return <p className="error">{departamentos.error}</p>;

  return (
    <Buscador
      publicaciones={catalogo.datos.publicaciones}
      departamentos={departamentos.datos}
      poblacion={"datos" in poblacion ? poblacion.datos : null}
    />
  );
}

interface PropsBuscador {
  publicaciones: Publicacion[];
  departamentos: Departamento[];
  poblacion: Poblacion | null;
}

function Buscador({ publicaciones, departamentos, poblacion }: PropsBuscador) {
  const minimo = Math.min(...publicaciones.map((p) => p.periodo_inicio));
  const maximo = Math.max(...publicaciones.map((p) => p.periodo_fin));
  // Por defecto, la última década hasta el año actual; el usuario puede abrir el rango completo.
  const hoy = Math.min(maximo, new Date().getFullYear());
  const [periodo, setPeriodo] = useState({ desde: Math.max(minimo, hoy - 10), hasta: hoy });
  const [departamento, setDepartamento] = useState<number | null>(null);

  const nombreDepartamento = departamentos.find((d) => d.codigo === departamento)?.nombre;

  const grupos = useMemo(() => {
    const enPeriodo = publicaciones
      .filter((p) => p.periodo_inicio <= periodo.hasta && p.periodo_fin >= periodo.desde)
      // Primero las que tienen datos en el sitio; después, las más recientes.
      .sort((a, b) => Number(!!b.datos) - Number(!!a.datos) || b.periodo_fin - a.periodo_fin);
    if (departamento === null) return { principales: enPeriodo, agregadas: [], porConfirmar: [] };
    return {
      principales: enPeriodo.filter((p) => llegaADepartamento(p.nivel_territorial_minimo)),
      agregadas: enPeriodo.filter((p) => ["nacional", "region"].includes(p.nivel_territorial_minimo)),
      porConfirmar: enPeriodo.filter((p) => p.nivel_territorial_minimo === "sin_determinar"),
    };
  }, [publicaciones, periodo, departamento]);

  const total = grupos.principales.length + grupos.agregadas.length + grupos.porConfirmar.length;

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
          {total} publicaciones entre {periodo.desde} y {periodo.hasta}
          {nombreDepartamento ? ` para ${nombreDepartamento}` : " para todo el país"}
        </h1>
        {nombreDepartamento && (
          <p className="nota">
            {grupos.principales.length} publican cifras a nivel de departamento o más detallado.
          </p>
        )}
        <Lista
          publicaciones={grupos.principales}
          poblacion={poblacion}
          departamento={departamento}
          nombreTerritorio={nombreDepartamento ?? "todo el país"}
          anio={periodo.hasta}
        />
        {grupos.agregadas.length > 0 && (
          <>
            <h2>Con cobertura nacional o regional</h2>
            <p className="nota">Incluyen a {nombreDepartamento}, pero no publican cifras propias del departamento.</p>
            <Lista publicaciones={grupos.agregadas} />
          </>
        )}
        {grupos.porConfirmar.length > 0 && (
          <>
            <h2>Nivel territorial por confirmar</h2>
            <p className="nota">Todavía no se revisó si estas publicaciones traen cifras por departamento.</p>
            <Lista publicaciones={grupos.porConfirmar} />
          </>
        )}
      </section>
    </div>
  );
}

interface PropsLista {
  publicaciones: Publicacion[];
  poblacion?: Poblacion | null;
  departamento?: number | null;
  nombreTerritorio?: string;
  anio?: number;
}

function Lista({ publicaciones, poblacion, departamento = null, nombreTerritorio = "", anio = 0 }: PropsLista) {
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
          {p.direccion_ine && <p className="publicacion-meta">{p.direccion_ine}</p>}
          <dl className="publicacion-datos">
            <dt>Periodo</dt>
            <dd className="ine-num">
              {p.periodo_inicio === p.periodo_fin ? p.periodo_inicio : `${p.periodo_inicio}–${p.periodo_fin}`}
              {p.periodicidad && ` · ${p.periodicidad}`}
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
          {p.como_se_determino === "supuesto" && (
            <p className="aviso-supuesto">El periodo o el nivel territorial se infirieron y falta verificarlos.</p>
          )}
          {p.datos === "poblacion" && poblacion && (
            <PanelPoblacion poblacion={poblacion} departamento={departamento} nombre={nombreTerritorio} anio={anio} />
          )}
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
