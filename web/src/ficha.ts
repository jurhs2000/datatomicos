import type { Publicacion } from "./datos";

export type VistaFicha = "cifras" | "productos";

export interface EstadoFicha {
  vista: VistaFicha;
  seleccion: Set<string>;
  destino: string | null;
  revision: number;
}

export type AccionFicha =
  | { tipo: "vista"; vista: VistaFicha }
  | { tipo: "abrir"; producto: string }
  | { tipo: "origen"; producto: string }
  | { tipo: "alternar"; producto: string };

export function iniciarFicha(): EstadoFicha {
  return { vista: "cifras", seleccion: new Set(), destino: null, revision: 0 };
}

/** Conserva la selección al navegar entre cifras y su producto de origen. */
export function reducirFicha(estado: EstadoFicha, accion: AccionFicha): EstadoFicha {
  if (accion.tipo === "origen") {
    return { ...estado, vista: "productos", destino: accion.producto, revision: estado.revision + 1 };
  }
  if (accion.tipo === "vista") {
    return accion.vista === estado.vista ? estado : { ...estado, vista: accion.vista, destino: null, revision: estado.revision + 1 };
  }
  const seleccion = new Set(estado.seleccion);
  if (accion.tipo === "alternar" && seleccion.has(accion.producto)) {
    seleccion.delete(accion.producto);
    return { ...estado, seleccion };
  }
  seleccion.add(accion.producto);
  return { vista: "cifras", seleccion, destino: accion.producto, revision: estado.revision + 1 };
}
/** El origen se muestra como excepción explícita cuando queda fuera de la consulta. */
export function productoDeOrigenFueraDeConsulta(estado: EstadoFicha, productos: Publicacion[], filtrados: Publicacion[]): Publicacion | undefined {
  if (estado.vista !== "productos" || !estado.destino || filtrados.some((p) => p.id === estado.destino)) return undefined;
  return productos.find((p) => p.id === estado.destino);
}
