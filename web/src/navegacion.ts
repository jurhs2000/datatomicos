import { useEffect, useState } from "react";

// Navegación por el hash de la URL (#/explorador, #/ipc).
// Funciona en GitHub Pages sin configurar redirecciones y no agrega dependencias.

export const RUTAS = {
  inicio: { hash: "#/", titulo: "Inicio" },
  explorador: { hash: "#/explorador", titulo: "Explorador" },
  ipc: { hash: "#/ipc", titulo: "IPC" },
} as const;

export type Ruta = keyof typeof RUTAS;

function rutaActual(): Ruta {
  const hash = window.location.hash || "#/";
  const encontrada = (Object.keys(RUTAS) as Ruta[]).find((r) => RUTAS[r].hash === hash);
  return encontrada ?? "inicio";
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(rutaActual);
  useEffect(() => {
    const actualizar = () => {
      setRuta(rutaActual());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", actualizar);
    return () => window.removeEventListener("hashchange", actualizar);
  }, []);
  return ruta;
}
