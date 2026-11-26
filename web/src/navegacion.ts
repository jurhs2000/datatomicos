import { useEffect, useState } from "react";

// Navegación por el hash de la URL (#/, #/calculadora?depto=8).
// Funciona en GitHub Pages sin configurar redirecciones y no agrega dependencias.

export const RUTAS = {
  explorar: { hash: "#/", titulo: "Explorar" },
  origen: { hash: "#/origen", titulo: "Origen de los datos" },
  calculadora: { hash: "#/calculadora", titulo: "Calculadora del IPC" },
} as const;

export type Ruta = keyof typeof RUTAS;

/** Orden de las páginas en la navegación del encabezado. */
export const NAVEGACION: Ruta[] = ["explorar", "origen", "calculadora"];

/** Rutas anteriores que siguen funcionando: llevan a la página que las reemplazó. */
const ALIAS: Record<string, Ruta> = {
  "#/explorador": "explorar",
  "#/inicio": "explorar",
  "#/ipc": "calculadora",
};

export interface Ubicacion {
  ruta: Ruta;
  parametros: URLSearchParams;
  /** Cambia en cada navegación externa, incluso si vuelve a la URL inicial. */
  revision: number;
}

function leerUbicacion(): Omit<Ubicacion, "revision"> {
  const [camino, consulta = ""] = (window.location.hash || "#/").split("?");
  const ruta =
    (Object.keys(RUTAS) as Ruta[]).find((r) => RUTAS[r].hash === camino) ?? ALIAS[camino] ?? "explorar";
  return { ruta, parametros: new URLSearchParams(consulta) };
}

type Valor = string | number | null | undefined;

/** Arma el hash de una página con sus parámetros; omite los vacíos. */
export function enlace(ruta: Ruta, parametros: Record<string, Valor> = {}): string {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== null && valor !== undefined && valor !== "") consulta.set(clave, String(valor));
  }
  const texto = consulta.toString();
  return texto ? `${RUTAS[ruta].hash}?${texto}` : RUTAS[ruta].hash;
}

/**
 * Cambia los parámetros de la página actual sin agregar una entrada al historial
 * ni volver a montar la vista. Sirve para que un enlace copiado abra la misma consulta.
 */
export function reemplazarParametros(parametros: Record<string, Valor>): void {
  const { ruta } = leerUbicacion();
  const nuevo = enlace(ruta, parametros);
  if (nuevo !== window.location.hash) window.history.replaceState(null, "", nuevo);
}

/** Distingue cada navegación externa aunque sus parámetros coincidan con los iniciales. */
export function siguienteUbicacion(anterior: Ubicacion, nueva: Omit<Ubicacion, "revision">): Ubicacion {
  return { ...nueva, revision: anterior.revision + 1 };
}

export function useUbicacion(): Ubicacion {
  const [ubicacion, setUbicacion] = useState<Ubicacion>(() => ({ ...leerUbicacion(), revision: 0 }));
  useEffect(() => {
    const actualizar = () => {
      const nueva = leerUbicacion();
      setUbicacion((anterior) => {
        if (anterior.ruta !== nueva.ruta) window.scrollTo(0, 0);
        return siguienteUbicacion(anterior, nueva);
      });
    };
    window.addEventListener("hashchange", actualizar);
    return () => window.removeEventListener("hashchange", actualizar);
  }, []);
  return ubicacion;
}
