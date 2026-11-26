import { useEffect, useState } from "react";

// Tipos y carga de los archivos de public/datos/.
// Los genera el pipeline (catálogo y territorio) y el notebook del IPC; no se editan a mano.

export type NivelTerritorial = "nacional" | "region" | "departamento" | "municipio" | "lugar_poblado" | "sin_determinar";

export interface Publicacion {
  id: string;
  titulo: string;
  tipo_publicacion: "encuesta" | "indice" | "censo" | "registro_administrativo" | "otro";
  direccion_ine: string | null;
  tema: string;
  periodo_inicio: number;
  periodo_fin: number;
  periodicidad: string | null;
  nivel_territorial_minimo: NivelTerritorial;
  base_metodologica: string | null;
  url_publicacion: string;
  url_descarga: string | null;
  formato: string[];
  en_ckan: boolean;
  licencia: string | null;
  fecha_descarga: string | null;
  datos: string | null;
  /** Cómo se determinaron el periodo y el nivel territorial; "supuesto" significa que falta verificarlos. */
  como_se_determino: "metadatos" | "contenido" | "titulo" | "supuesto" | null;
  notas: string | null;
}

export interface Catalogo {
  generado: string;
  publicaciones: Publicacion[];
}

export interface Departamento {
  codigo: number;
  nombre: string;
}

export interface PuntoSerie {
  fecha: string;
  ipc: number;
}

export interface MesValidacion {
  fecha: string;
  observado: number;
  pronostico: number;
  inferior_80: number;
  superior_80: number;
  inferior_95: number;
  superior_95: number;
}

export interface Validacion {
  modelo: string;
  entrenamiento: { inicio: string; fin: string };
  prueba: { inicio: string; fin: string };
  metricas: { MAE: number; RMSE: number; MAPE: number };
  ljung_box_p: number;
  meses: MesValidacion[];
}

export interface Poblacion {
  fuente: string;
  url: string;
  anios: number[];
  pais: number[];
  /** Por código de departamento o municipio del INE (sin ceros a la izquierda). */
  departamentos: Record<string, number[]>;
  municipios: Record<string, number[]>;
}

export interface Coeficientes {
  anio_precios: number;
  departamentos: { codigo: number; nombre: string; coeficiente: number; observaciones: number }[];
}

/** El lugar que se consulta en Explorar. */
export type Lugar =
  | { nivel: "pais" }
  | { nivel: "departamento"; codigo: number; nombre: string }
  | { nivel: "municipio"; codigo: number; nombre: string; departamento: Departamento };

/** «Todo el país», «Totonicapán» o «Momostenango, Totonicapán». */
export function nombreLugar(lugar: Lugar): string {
  if (lugar.nivel === "pais") return "Todo el país";
  if (lugar.nivel === "municipio") return `${lugar.nombre}, ${lugar.departamento.nombre}`;
  return lugar.nombre;
}

/** «2018–2025», o un solo año si el periodo empieza y termina en el mismo. */
export function textoPeriodo(desde: number, hasta: number): string {
  return desde === hasta ? String(desde) : `${desde}–${hasta}`;
}

/** Nivel territorial de más grueso a más fino: sirve para comparar niveles. */
export const ORDEN_NIVEL: NivelTerritorial[] = ["nacional", "region", "departamento", "municipio", "lugar_poblado"];

/** ¿La publicación tiene datos a nivel de departamento o más fino? */
export function llegaADepartamento(nivel: NivelTerritorial): boolean {
  return ORDEN_NIVEL.indexOf(nivel) >= ORDEN_NIVEL.indexOf("departamento");
}

export const NOMBRE_NIVEL: Record<NivelTerritorial, string> = {
  nacional: "Nacional",
  region: "Región",
  departamento: "Departamento",
  municipio: "Municipio",
  lugar_poblado: "Lugar poblado",
  sin_determinar: "Por confirmar",
};

export type Estado<T> = { cargando: true } | { cargando: false; datos: T } | { cargando: false; error: string };

/**
 * Lee un JSON y devuelve null si no existe. Revisa el tipo de contenido porque el servidor
 * de desarrollo responde con index.html (y código 200) cuando un archivo no existe.
 */
export async function leerJson<T = unknown>(url: string): Promise<T | null> {
  try {
    const respuesta = await fetch(url);
    const tipo = respuesta.headers.get("content-type") ?? "";
    if (!respuesta.ok || tipo.includes("text/html")) return null;
    return (await respuesta.json()) as T;
  } catch {
    return null;
  }
}

/** Carga un JSON de public/datos/. La ruta es relativa para que funcione en cualquier subcarpeta. */
export function useJson<T>(ruta: string): Estado<T> {
  const [estado, setEstado] = useState<Estado<T>>({ cargando: true });
  useEffect(() => {
    let vigente = true;
    leerJson<T>(`./datos/${ruta}`).then((datos) => {
      if (!vigente) return;
      setEstado(datos === null ? { cargando: false, error: `No se encontró datos/${ruta}` } : { cargando: false, datos });
    });
    return () => {
      vigente = false;
    };
  }, [ruta]);
  return estado;
}
