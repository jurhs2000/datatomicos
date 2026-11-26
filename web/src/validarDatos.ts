// Validación de los archivos generados antes de entregarlos a la interfaz.
type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown): v is string => typeof v === "string";
const urlWeb = (v: unknown): boolean => {
  if (!texto(v) || /[\s\u0000-\u001f\u007f\\]/.test(v) || !/^https?:\/\//i.test(v)) return false;
  try {
    const url = new URL(v);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
};
const urlOpcional = (v: unknown) => v === null || urlWeb(v);
const numero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const lista = (v: unknown, comprobar: (x: unknown) => boolean, minimo = 0): v is unknown[] =>
  Array.isArray(v) && v.length >= minimo && v.every(comprobar);
const campos = (v: unknown, reglas: Record<string, (x: unknown) => boolean>): v is Objeto =>
  objeto(v) && Object.entries(reglas).every(([k, regla]) => regla(v[k]));
const cadenas = (v: unknown) => lista(v, texto);
const numeros = (v: unknown) => lista(v, numero, 1);
const fecha = (v: unknown) => texto(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const intervalo = (v: unknown) => campos(v, { inicio: fecha, fin: fecha });
const departamento = (v: unknown) => campos(v, { codigo: numero, nombre: texto });
const punto = (v: unknown) => campos(v, { fecha, ipc: numero });
const mesesValidacion = (v: unknown) => campos(v, { fecha, observado: numero, pronostico: numero, inferior_80: numero, superior_80: numero, inferior_95: numero, superior_95: numero });
const publicacion = (v: unknown) => campos(v, { id: texto, titulo: texto, operacion: texto, ediciones: cadenas, tipo_operacion: texto, periodo_inicio: numero, periodo_fin: numero, nivel_territorial_minimo: texto, url_publicacion: urlWeb, url_descarga: urlOpcional, nivel_procesamiento: cadenas, formato: cadenas });
const operacion = (v: unknown) => campos(v, { id: texto, nombre: texto, tipo_operacion: texto, descripcion: texto, descripcion_origen: texto, url_portal: urlWeb, url_descripcion: urlOpcional, url_metodologia: urlOpcional, menu_portal: cadenas });
const edicion = (v: unknown) => campos(v, { id: texto, operacion: texto, nombre: texto, anio_inicio: numero, anio_fin: numero, url_portal: urlOpcional, url_metodologia: urlOpcional });
const relacion = (v: unknown) => campos(v, { id: texto, operacion: texto, insumo_externo: cadenas, tipo_relacion: texto, descripcion: texto, url_respaldo: urlWeb, confianza: texto });
const tema = (v: unknown) => campos(v, { id: texto, nombre: texto, orden_portal: numero, url_portal: urlWeb });
const catalogo = (v: unknown) => campos(v, { generado: texto, publicaciones: (x) => lista(x, publicacion, 1), operaciones: (x) => lista(x, operacion, 1), ediciones: (x) => lista(x, edicion), relaciones: (x) => lista(x, relacion), temas: (x) => lista(x, tema) });
const poblacion = (v: unknown) => {
  if (!campos(v, { fuente: texto, url: urlWeb, anios: numeros, pais: numeros, departamentos: objeto, municipios: objeto })) return false;
  const cantidad = (v.anios as unknown[]).length;
  const serie = (x: unknown) => numeros(x) && x.length === cantidad;
  return serie(v.pais) && Object.values(v.departamentos as Objeto).every(serie) && Object.values(v.municipios as Objeto).every(serie);
};
const pronostico = (v: unknown) => campos(v, { modelo: texto, escala: texto, historial: intervalo, el_nino: (x) => campos(x, { coeficiente: numero, efecto_porcentual: numero }), z: (x) => campos(x, { "80": numero, "95": numero }), meses: (x) => lista(x, (m) => campos(m, { fecha, log_base: numero, sigma: numero }), 12) });
const validacion = (v: unknown) => campos(v, { modelo: texto, entrenamiento: intervalo, prueba: intervalo, metricas: (x) => campos(x, { MAE: numero, RMSE: numero, MAPE: numero }), ljung_box_p: numero, meses: (x) => lista(x, mesesValidacion, 1) });
const coeficientes = (v: unknown) => campos(v, { anio_precios: numero, departamentos: (x) => lista(x, (d) => campos(d, { codigo: numero, nombre: texto, coeficiente: numero, observaciones: numero }), 1) });
const coordenadas = (v: unknown): boolean => Array.isArray(v) && v.length > 0 && (v.every(numero) ? v.length >= 2 : v.every(coordenadas));
const limites = (v: unknown, municipios: boolean) => campos(v, { type: (x) => x === "FeatureCollection", features: (x) => lista(x, (f) => campos(f, { type: (t) => t === "Feature", properties: (p) => campos(p, municipios ? { codigo: numero, nombre: texto, departamento: numero } : { codigo: numero, nombre: texto }), geometry: (g) => campos(g, { type: (t) => t === "Polygon" || t === "MultiPolygon", coordinates: coordenadas }) }), 1) });

/** Rechaza rutas no conocidas para que un archivo nuevo declare explícitamente su contrato. */
export function validarDatos(ruta: string, valor: unknown): boolean {
  switch (ruta) {
    case "catalogo.json": return catalogo(valor);
    case "territorio/departamentos.json": return lista(valor, departamento, 1);
    case "territorio/departamentos.geojson": return limites(valor, false);
    case "territorio/municipios.geojson": return limites(valor, true);
    case "poblacion/proyecciones.json": return poblacion(valor);
    case "ipc/serie.json": return lista(valor, punto, 1);
    case "ipc/pronostico.json": return pronostico(valor);
    case "ipc/validacion.json": return validacion(valor);
    case "ipc/coeficientes.json": return coeficientes(valor);
    default: return false;
  }
}
