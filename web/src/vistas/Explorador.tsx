import { useEffect, useMemo, useState } from "react";
import { LineaDeTiempo } from "../componentes/LineaDeTiempo";
import { Mapa } from "../componentes/Mapa";
import { TarjetaPoblacion } from "../componentes/TarjetaPoblacion";
import { TarjetaPrecios } from "../componentes/TarjetaPrecios";
import { enlace, reemplazarParametros, useUbicacion } from "../navegacion";
import {
  NOMBRE_NIVEL,
  llegaADepartamento,
  nombreLugar,
  textoPeriodo,
  useJson,
  type Catalogo,
  type Departamento,
  type Lugar,
  type Poblacion,
  type Publicacion,
} from "../datos";

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
          productos={catalogo.datos.publicaciones}
          departamentos={departamentos.datos}
          poblacion={"datos" in poblacion ? poblacion.datos : null}
        />
      )}
    </>
  );
}

interface PropsBuscador {
  productos: Publicacion[];
  departamentos: Departamento[];
  poblacion: Poblacion | null;
}

/** Lee un número entero de la URL, o null si no está o no es válido. */
function entero(parametros: URLSearchParams, clave: string): number | null {
  const valor = Number(parametros.get(clave));
  return parametros.has(clave) && Number.isInteger(valor) ? valor : null;
}

function Buscador({ productos, departamentos, poblacion }: PropsBuscador) {
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

  useEffect(() => {
    reemplazarParametros({ depto: departamento, desde: periodo.desde, hasta: periodo.hasta });
  }, [departamento, periodo]);

  const lugar = useMemo<Lugar>(() => {
    const d = departamentos.find((x) => x.codigo === departamento);
    return d ? { nivel: "departamento", codigo: d.codigo, nombre: d.nombre } : { nivel: "pais" };
  }, [departamentos, departamento]);

  const grupos = useMemo(() => {
    const enPeriodo = productos
      .filter((p) => p.periodo_inicio <= periodo.hasta && p.periodo_fin >= periodo.desde)
      // Primero los que tienen cifras en el Atlas; después, los más recientes.
      .sort((a, b) => Number(!!b.datos) - Number(!!a.datos) || b.periodo_fin - a.periodo_fin);
    if (lugar.nivel === "pais") return { principales: enPeriodo, agregados: [], porConfirmar: [] };
    return {
      principales: enPeriodo.filter((p) => llegaADepartamento(p.nivel_territorial_minimo)),
      agregados: enPeriodo.filter((p) => ["nacional", "region"].includes(p.nivel_territorial_minimo)),
      porConfirmar: enPeriodo.filter((p) => p.nivel_territorial_minimo === "sin_determinar"),
    };
  }, [productos, periodo, lugar]);

  const total = grupos.principales.length + grupos.agregados.length + grupos.porConfirmar.length;
  const nombre = nombreLugar(lugar);
  const periodoTexto = textoPeriodo(periodo.desde, periodo.hasta);
  const deptoParaEnlaces = lugar.nivel === "pais" ? null : lugar.codigo;

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

      <article className="ficha" aria-live="polite">
        <h2 className="ficha-titulo">
          {nombre}, <span className="ine-num">{periodoTexto}</span>
        </h2>

        <section className="ficha-seccion">
          <h3>En cifras</h3>
          <div className="cifras">
            {poblacion && (
              <TarjetaPoblacion poblacion={poblacion} lugar={lugar} desde={periodo.desde} hasta={periodo.hasta} />
            )}
            {lugar.nivel !== "pais" && (
              <TarjetaPrecios
                departamento={lugar.nivel === "municipio" ? lugar.departamento.codigo : lugar.codigo}
                nombre={lugar.nivel === "municipio" ? lugar.departamento.nombre : lugar.nombre}
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
          {lugar.nivel !== "pais" && (
            <>
              <h4 className="grupo-titulo">Con cifras de {nombre}</h4>
              <p className="nota">
                {grupos.principales.length} publican cifras a nivel de departamento o más detallado.
              </p>
            </>
          )}
          <Lista productos={grupos.principales} depto={deptoParaEnlaces} />
          {grupos.agregados.length > 0 && (
            <>
              <h4 className="grupo-titulo">Con cobertura nacional o regional</h4>
              <p className="nota">Incluyen a {nombre}, pero no publican cifras propias del departamento.</p>
              <Lista productos={grupos.agregados} depto={deptoParaEnlaces} />
            </>
          )}
          {grupos.porConfirmar.length > 0 && (
            <>
              <h4 className="grupo-titulo">Nivel territorial por confirmar</h4>
              <p className="nota">Todavía no se revisó si estos productos traen cifras por departamento.</p>
              <Lista productos={grupos.porConfirmar} depto={deptoParaEnlaces} />
            </>
          )}
        </section>
      </article>
    </div>
  );
}

function Lista({ productos, depto }: { productos: Publicacion[]; depto: number | null }) {
  if (productos.length === 0) return <p className="nota">Ningún producto coincide con los filtros.</p>;
  return (
    <ul className="lista-productos">
      {productos.map((p) => (
        <li key={p.id} className="producto ine-esquina-sm">
          <h5>
            <a href={p.url_publicacion} target="_blank" rel="noreferrer">
              {p.titulo}
            </a>
          </h5>
          {p.direccion_ine && <p className="producto-meta">{p.direccion_ine}</p>}
          <dl className="producto-datos">
            <dt>Periodo</dt>
            <dd className="ine-num">
              {textoPeriodo(p.periodo_inicio, p.periodo_fin)}
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
          {p.datos === "poblacion" && <p className="nota">Sus cifras están arriba, en «En cifras».</p>}
          {p.datos === "ipc" && (
            <a className="boton" href={enlace("calculadora", { depto })}>
              Abrir en la calculadora del IPC
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
