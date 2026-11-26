import type { FilaCifra, KpiCifra, Lugar, ProductoCifras } from "./datos";

export interface CargaCifras {
  productos: ProductoCifras[];
  faltantes: string[];
}

/** El lector valida cada archivo; un producto ausente no oculta los que sí cargaron. */
export async function cargarCifras(leer: <T>(ruta: string) => Promise<T | null>): Promise<CargaCifras> {
  const indice = await leer<string[]>("./datos/cifras/indice.json");
  if (indice === null) throw new Error("No se pudo cargar el índice de cifras o tiene un formato inválido.");
  const archivos = await Promise.all(indice.map((nombre) => leer<ProductoCifras>(`./datos/cifras/${nombre}.json`)));
  const productos = archivos.filter((p): p is ProductoCifras => p !== null);
  if (new Set(productos.map((p) => p.producto)).size !== productos.length) throw new Error("El índice de cifras repite un producto.");
  return { productos, faltantes: indice.filter((_, i) => archivos[i] === null) };
}

/** Busca filas preparadas; nunca suma conteos ni promedia porcentajes en la interfaz. */
export function resumirCifra(producto: ProductoCifras, kpi: string, lugar: Lugar, desde: number, hasta: number) {
  const niveles: { nivel: FilaCifra["nivel"]; territorio: number; nombre: string }[] = [];
  if (lugar.nivel !== "pais") niveles.push({ nivel: lugar.nivel, territorio: lugar.codigo, nombre: lugar.nombre });
  if (lugar.nivel === "municipio") niveles.push({ nivel: "departamento", territorio: lugar.departamento.codigo, nombre: lugar.departamento.nombre });
  niveles.push({ nivel: "pais", territorio: 0, nombre: "Todo el país" });

  for (const nivel of niveles) {
    const serie = producto.filas
      .filter((f) => f.kpi === kpi && f.nivel === nivel.nivel && f.territorio === nivel.territorio)
      .sort((a, b) => a.anio - b.anio);
    const disponibles = serie.filter((f) => f.valor !== null);
    if (!disponibles.length) continue;
    const enRango = disponibles.filter((f) => f.anio >= desde && f.anio <= hasta);
    const elegida = enRango.at(-1) ?? [...disponibles].sort((a, b) => {
      const distancia = (anio: number) => anio < desde ? desde - anio : anio > hasta ? anio - hasta : 0;
      return distancia(a.anio) - distancia(b.anio) || b.anio - a.anio;
    })[0];
    return { serie, elegida, fueraDeRango: !enRango.length, nivel, nivelSuperior: nivel.nivel !== lugar.nivel };
  }
  return null;
}

export function formatearCifra(valor: number | null, kpi: KpiCifra): string {
  if (valor === null) return "Sin dato";
  return valor.toLocaleString("es-GT", {
    minimumFractionDigits: kpi.tipo === "conteo" ? 0 : 1,
    maximumFractionDigits: kpi.tipo === "conteo" ? 0 : 1,
  });
}

export function avisoCifras(productos: ProductoCifras[]): string {
  if (!productos.length) return "";
  const nombres = new Intl.ListFormat("es", { style: "long", type: "conjunction" }).format(productos.map((p) => p.titulo));
  return productos.length === 1
    ? `${nombres} también tiene cifras: actívalas con el selector de esta sección.`
    : `${nombres} también tienen cifras: actívalas con el selector de esta sección.`;
}
