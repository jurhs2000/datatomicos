import { lazy, Suspense } from "react";
import { RUTAS, useRuta, type Ruta } from "./navegacion";
import { Inicio } from "./vistas/Inicio";

// El explorador (MapLibre) y el IPC (Observable Plot) se cargan solo al abrirlos,
// para que la portada abra rápido.
const VISTAS: Record<Ruta, React.ComponentType> = {
  inicio: Inicio,
  explorador: lazy(() => import("./vistas/Explorador").then((m) => ({ default: m.Explorador }))),
  ipc: lazy(() => import("./vistas/Ipc").then((m) => ({ default: m.Ipc }))),
};

export function App() {
  const ruta = useRuta();
  const Vista = VISTAS[ruta];

  return (
    <div className="ine-base sitio">
      <header className="encabezado">
        <a className="marca" href={RUTAS.inicio.hash}>
          <span className="ine-tribarra" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="marca-nombre">Datatómicos</span>
          <span className="marca-sub">Datos del INE por tiempo y territorio</span>
        </a>
        <nav aria-label="Secciones">
          {(Object.keys(RUTAS) as Ruta[]).map((r) => (
            <a key={r} href={RUTAS[r].hash} aria-current={r === ruta ? "page" : undefined}>
              {RUTAS[r].titulo}
            </a>
          ))}
        </nav>
      </header>

      <main className="contenido">
        <Suspense fallback={<p>Cargando…</p>}>
          <Vista />
        </Suspense>
      </main>

      <footer className="pie">
        <p>
          <strong>Fuente de los datos:</strong> Instituto Nacional de Estadística (INE), Guatemala.{" "}
          <a href="https://datos.ine.gob.gt">datos.ine.gob.gt</a> ·{" "}
          <a href="https://www.ine.gob.gt">www.ine.gob.gt</a>
        </p>
        <p>
          Proyecto del equipo Datatómicos para el Datatón INE 2026. Las proyecciones y estimaciones marcadas como tales
          son cálculos del equipo, no cifras oficiales del INE.
        </p>
      </footer>
    </div>
  );
}
