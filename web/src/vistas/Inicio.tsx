import { RUTAS } from "../navegacion";

export function Inicio() {
  return (
    <>
      <section className="portada ine-esquina">
        <h1>Lo que publica el INE, por dónde y por cuándo</h1>
        <p>
          Cada publicación del Instituto Nacional de Estadística corresponde a un periodo y a un territorio. Este sitio
          las reúne para que se puedan buscar con esos dos criterios: elige un rango de años y un lugar, y ve qué hay
          disponible.
        </p>
      </section>

      <section className="tarjetas">
        <a className="tarjeta ine-esquina-sm" href={RUTAS.explorador.hash}>
          <h2>Explorador</h2>
          <p>Busca publicaciones del INE con una línea de tiempo y un mapa de departamentos.</p>
        </a>
        <a className="tarjeta ine-esquina-sm" href={RUTAS.ipc.hash}>
          <h2>Índice de Precios al Consumidor</h2>
          <p>
            La serie publicada por el INE, cómo le fue al modelo de proyección del equipo y el nivel de precios
            estimado por departamento.
          </p>
        </a>
      </section>
    </>
  );
}
