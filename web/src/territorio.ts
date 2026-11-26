import { useEffect, useState } from "react";
import { leerJson } from "./datos";

// Capas de límites (pipeline/preparar_territorio.py). Se piden una sola vez y se comparten
// entre los mapas y la lista de municipios.

export type Capa = "departamentos" | "municipios";

export interface PropiedadesLimite {
  codigo: number;
  nombre: string;
  /** Solo en municipios: código del departamento. */
  departamento?: number;
}

export interface Limite {
  type: "Feature";
  properties: PropiedadesLimite;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
}

export interface ColeccionLimites {
  type: "FeatureCollection";
  features: Limite[];
}

export interface Municipio {
  codigo: number;
  nombre: string;
  departamento: number;
}

/** Atribución que pide la licencia CC BY-IGO de los límites. */
export const ATRIBUCION_LIMITES = "Límites: CONRED / OCHA (HDX), CC BY-IGO";

const pedidos = new Map<Capa, Promise<ColeccionLimites | null>>();

export function cargarCapa(capa: Capa): Promise<ColeccionLimites | null> {
  if (!pedidos.has(capa)) {
    const pedido = leerJson<ColeccionLimites>(`./datos/territorio/${capa}.geojson`).then((resultado) => {
      if (!resultado) pedidos.delete(capa);
      return resultado;
    });
    pedidos.set(capa, pedido);
  }
  return pedidos.get(capa)!;
}

/** Los lagos de Amatitlán y Atitlán vienen en la capa de municipios con código terminado en 00; no se seleccionan. */
export function esLago(codigo: number): boolean {
  return codigo % 100 === 0;
}

/** Municipios de un departamento, en orden alfabético. Carga la capa la primera vez que se pide. */
export function useMunicipios(departamento: number | null): Municipio[] | null {
  const [todos, setTodos] = useState<Municipio[] | null>(null);
  useEffect(() => {
    if (departamento === null || todos) return;
    let vigente = true;
    cargarCapa("municipios").then((capa) => {
      if (!vigente || !capa) return;
      setTodos(
        capa.features
          .map((f) => f.properties)
          .filter((p) => !esLago(p.codigo))
          .map((p) => ({ codigo: p.codigo, nombre: p.nombre, departamento: p.departamento! }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      );
    });
    return () => {
      vigente = false;
    };
  }, [departamento, todos]);
  if (departamento === null || !todos) return null;
  return todos.filter((m) => m.departamento === departamento);
}
