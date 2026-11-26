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
  | { tipo: "alternar"; producto: string };

export function iniciarFicha(): EstadoFicha {
  return { vista: "cifras", seleccion: new Set(), destino: null, revision: 0 };
}

/** Cambiar de vista conserva la selección; abrir un producto siempre lleva a sus cifras. */
export function reducirFicha(estado: EstadoFicha, accion: AccionFicha): EstadoFicha {
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
