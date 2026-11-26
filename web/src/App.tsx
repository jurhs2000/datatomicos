import { lazy, Suspense } from "react";
import { NAVEGACION, RUTAS, useUbicacion, type Ruta } from "./navegacion";

// Cada página (MapLibre en Explorar, Observable Plot en la calculadora) se carga al abrirla.
const VISTAS: Record<Ruta, React.ComponentType> = {
  explorar: lazy(() => import("./vistas/Explorador").then((m) => ({ default: m.Explorador }))),
  calculadora: lazy(() => import("./vistas/Ipc").then((m) => ({ default: m.Ipc }))),
};

export function App() {
  const { ruta } = useUbicacion();
  const Vista = VISTAS[ruta];

  return (
    <div className="ine-base sitio">
      <header className="encabezado">
        <a className="marca" href={RUTAS.explorar.hash}>
          <span className="ine-tribarra" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="marca-nombre">Atlas INE</span>
        </a>
        <nav aria-label="Páginas">
          {NAVEGACION.map((r) => (
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
        <img
          className="pie-logo"
          src="./ine-imagotipo-horizontal-color.svg"
          alt="Instituto Nacional de Estadística, Guatemala"
          width={186}
          height={60}
        />
        <div className="pie-texto">
          <p>
            Atlas INE es una propuesta del equipo Datatómicos para el Datatón INE 2026. Datos del Instituto Nacional de
            Estadística de Guatemala; cada cifra enlaza a su fuente.
          </p>
          <p>
            <a href="https://www.ine.gob.gt">www.ine.gob.gt</a> · <a href="https://datos.ine.gob.gt">datos.ine.gob.gt</a>.
            Las proyecciones y estimaciones marcadas como tales son cálculos del equipo, no cifras oficiales del INE.
          </p>
        </div>
      </footer>
    </div>
  );
}
