// Origen de cada producto: operación estadística, edición y tema, a partir de catalogo.json.

import type { Catalogo, Edicion, NivelProcesamiento, Operacion, Publicacion, Tema, TipoOperacion } from "./datos";

/** Valor del filtro de tema para los productos que el portal no ubica en ningún tema. */
export const SIN_TEMA = "sin-tema";
export const NOMBRE_SIN_TEMA = "Sin tema en el portal";

export const TIPOS_OPERACION: TipoOperacion[] = ["censo", "encuesta", "indice", "registro_administrativo", "estimacion"];

export const NOMBRE_TIPO: Record<TipoOperacion, { singular: string; plural: string }> = {
  censo: { singular: "Censo", plural: "Censos" },
  encuesta: { singular: "Encuesta", plural: "Encuestas" },
  indice: { singular: "Índice", plural: "Índices" },
  registro_administrativo: { singular: "Registro administrativo", plural: "Registros administrativos" },
  estimacion: { singular: "Estimación", plural: "Estimaciones" },
};

export const NOMBRE_PROCESAMIENTO: Record<NivelProcesamiento, string> = {
  microdatos: "microdatos",
  cuadros: "cuadros",
  indicadores: "indicadores",
  informes: "informes",
};

export interface Indice {
  operaciones: Map<string, Operacion>;
  ediciones: Map<string, Edicion>;
  temas: Map<string, Tema>;
}

export function indexar(catalogo: Catalogo): Indice {
  return {
    operaciones: new Map(catalogo.operaciones.map((o) => [o.id, o])),
    ediciones: new Map(catalogo.ediciones.map((e) => [e.id, e])),
    temas: new Map(catalogo.temas.map((t) => [t.id, t])),
  };
}

/** Siglas si las tiene (ENCOVI, IPC); si no, el nombre completo. */
export function nombreCorto(operacion: Operacion): string {
  return operacion.siglas ?? operacion.nombre;
}

/** Nombres de las ediciones que cubre un producto, separados por coma. */
export function nombresEdiciones(indice: Indice, ids: string[]): string {
  return ids
    .map((id) => indice.ediciones.get(id)?.nombre)
    .filter(Boolean)
    .join(", ");
}

/** «ENCOVI · ENCOVI 2023», o solo la operación si el producto no declara edición. */
export function textoOrigen(indice: Indice, producto: Publicacion): string {
  const operacion = indice.operaciones.get(producto.operacion);
  const nombre = operacion ? nombreCorto(operacion) : producto.operacion;
  const ediciones = nombresEdiciones(indice, producto.ediciones);
  return ediciones ? `${nombre} · ${ediciones}` : nombre;
}

/** Id del tema del producto para el filtro: el del portal o SIN_TEMA. */
export function temaDe(producto: Publicacion): string {
  return producto.tema_portal ?? SIN_TEMA;
}
