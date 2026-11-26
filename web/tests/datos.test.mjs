import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validarDatos } from "../src/validarDatos.ts";
import { proyectar } from "../src/proyeccionIpc.ts";
import { cargarCifras, resumirCifra, formatearCifra, avisoCifras } from "../src/cifras.ts";
import { productoDePrueba } from "./fixtures/cifras.mjs";

const leer = async (ruta) => JSON.parse(await readFile(new URL(`../public/datos/${ruta}`, import.meta.url), "utf8"));
const rutas = ["catalogo.json", "territorio/departamentos.json", "territorio/departamentos.geojson", "territorio/municipios.geojson", "poblacion/proyecciones.json", "ipc/serie.json", "ipc/pronostico.json", "ipc/validacion.json", "ipc/coeficientes.json"];

test("los archivos generados cumplen los contratos consumidos por la interfaz", async () => {
  for (const ruta of rutas) assert.equal(validarDatos(ruta, await leer(ruta)), true, ruta);
});

test("los productos de cifras generados cumplen el contrato y enlazan al catálogo", async (t) => {
  let indice;
  try {
    indice = await leer("cifras/indice.json");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    t.skip("Falta cifras/indice.json del pipeline; integración pendiente.");
    return;
  }
  assert.equal(validarDatos("cifras/indice.json", indice), true);
  const catalogo = await leer("catalogo.json");
  const ids = new Set();
  for (const nombre of indice) {
    const ruta = `cifras/${nombre}.json`;
    const cifras = await leer(ruta);
    assert.equal(validarDatos(ruta, cifras), true, ruta);
    assert.equal(ids.has(cifras.producto), false, `Producto repetido: ${cifras.producto}`);
    ids.add(cifras.producto);
    const producto = catalogo.publicaciones.find((p) => p.id === cifras.producto);
    assert.ok(producto, cifras.producto);
    assert.equal(cifras.operacion, producto.operacion);
    assert.ok(cifras.edicion === null || producto.ediciones.includes(cifras.edicion));
  }
});

test("el contrato de cifras admite productos nuevos y años sin fila", () => {
  assert.equal(validarDatos("cifras/indice.json", ["producto_nuevo", "otro-2"]), true);
  assert.equal(validarDatos("cifras/indice.json", []), true);
  const producto = productoDePrueba();
  assert.equal(validarDatos("cifras/producto_nuevo.json", producto), true);
  producto.kpis.push({ id: "extra", nombre: "Tasa de prueba", unidad: "por mil", tipo: "tasa" });
  producto.filas.push({ kpi: "extra", nivel: "pais", territorio: 0, anio: 2022, valor: 12.3 });
  assert.equal(validarDatos("cifras/producto_nuevo.json", producto), true);
});

test("rechaza índices inseguros, filas ambiguas y porcentajes inválidos", () => {
  for (const indice of [null, [2], ["indice"], ["../secreto"], ["https://example.com"], ["con/ruta"], ["x.json"], ["x", "x"]]) {
    assert.equal(validarDatos("cifras/indice.json", indice), false);
  }
  for (const modificar of [
    (p) => { p.url = "javascript:alert(1)"; },
    (p) => { p.url = "https://usuario:clave@example.com"; },
    (p) => { p.anios = []; },
    (p) => { p.anios = [2022, "2023"]; },
    (p) => { p.anios = [2022, 2022]; },
    (p) => { p.kpis.push(p.kpis[0]); },
    (p) => { p.kpis[0].tipo = "desconocido"; },
    (p) => { p.filas.push(p.filas[0]); },
    (p) => { p.filas[0].valor = -1; },
    (p) => { p.filas[0].valor = 1.2; },
    (p) => { p.filas[0].valor = null; },
    (p) => { p.filas[0].anio = 2040; },
    (p) => { p.filas[0].territorio = 0; },
    (p) => { p.filas[0].nivel = "region"; },
    (p) => { p.filas[0].kpi = "otro"; },
    (p) => { delete p.filas[2].denominador; },
    (p) => { p.filas[2].numerador = 5; },
    (p) => { p.filas[2].valor = 101; },
    (p) => { p.filas[2].valor = null; },
    (p) => { p.filas[2].denominador = 0; p.filas[2].numerador = 0; },
  ]) {
    const producto = productoDePrueba();
    modificar(producto);
    assert.equal(validarDatos("cifras/prueba.json", producto), false, modificar.toString());
  }
  assert.equal(validarDatos("cifras/../prueba.json", productoDePrueba()), false);
});

test("la carga sigue el índice, admite otro producto y conserva los válidos si falla uno", async () => {
  const primero = productoDePrueba();
  const segundo = { ...productoDePrueba(), producto: "otro-producto", titulo: "Otro producto" };
  const peticiones = [];
  const archivos = new Map([
    ["./datos/cifras/indice.json", ["primero", "ausente", "segundo"]],
    ["./datos/cifras/primero.json", primero],
    ["./datos/cifras/segundo.json", segundo],
  ]);
  const lector = async (ruta) => { peticiones.push(ruta); return archivos.get(ruta) ?? null; };
  const carga = await cargarCifras(lector);
  assert.deepEqual(carga.productos, [primero, segundo]);
  assert.deepEqual(carga.faltantes, ["ausente"]);
  assert.equal(peticiones.length, 4);
  archivos.set("./datos/cifras/segundo.json", primero);
  await assert.rejects(() => cargarCifras(lector), /repite un producto/);
  await assert.rejects(() => cargarCifras(async () => null), /índice de cifras/);
});

const momostenango = { nivel: "municipio", codigo: 805, nombre: "Momostenango", departamento: { codigo: 8, nombre: "Totonicapán" } };

test("resume el último dato del rango, el más cercano y los años sin denominador", () => {
  const producto = productoDePrueba();
  assert.equal(resumirCifra(producto, "total", momostenango, 2022, 2025).elegida.valor, 1500);
  assert.equal(resumirCifra(producto, "total", momostenango, 2022, 2024).elegida.anio, 2022);
  const anterior = resumirCifra(producto, "total", momostenango, 2018, 2020);
  assert.equal(anterior.elegida.anio, 2022);
  assert.equal(anterior.fueraDeRango, true);
  assert.equal(resumirCifra(producto, "total", momostenango, 2030, 2035).elegida.anio, 2025);
  assert.equal(resumirCifra(producto, "total", momostenango, 2023, 2024).elegida.anio, 2025);
  assert.equal(resumirCifra(producto, "parte", momostenango, 2022, 2025).elegida.anio, 2022);
});

test("usa el nivel superior preparado y nunca combina sus porcentajes", () => {
  const producto = productoDePrueba();
  const sinMunicipio = { ...momostenango, codigo: 801, nombre: "Otro municipio" };
  const superior = resumirCifra(producto, "total", sinMunicipio, 2022, 2025);
  assert.equal(superior.nivel.nivel, "departamento");
  assert.equal(superior.elegida.valor, 5000);
  assert.equal(superior.nivelSuperior, true);
  const otroDepartamento = { nivel: "departamento", codigo: 1, nombre: "Guatemala" };
  assert.equal(resumirCifra(producto, "total", otroDepartamento, 2022, 2025).elegida.valor, 90000);
  assert.equal(resumirCifra(producto, "total", { nivel: "pais" }, 2022, 2025).nivelSuperior, false);
  assert.equal(resumirCifra(producto, "parte", otroDepartamento, 2022, 2025), null);
});

test("las cifras y el aviso usan la unidad, el tipo y los títulos del archivo", () => {
  const producto = productoDePrueba();
  assert.equal(formatearCifra(1234, producto.kpis[0]), "1,234");
  assert.equal(formatearCifra(25, producto.kpis[1]), "25.0");
  assert.equal(formatearCifra(null, producto.kpis[1]), "Sin dato");
  assert.match(avisoCifras([producto, { ...producto, titulo: "Otro producto" }]), /^Producto de prueba y Otro producto también tienen cifras/);
  assert.equal(avisoCifras([]), "");
});

test("rechaza archivos vacíos, datos incompatibles y rutas sin contrato", async () => {
  for (const ruta of rutas) assert.equal(validarDatos(ruta, null), false, ruta);
  const pronostico = await leer("ipc/pronostico.json");
  pronostico.meses = [];
  assert.equal(validarDatos("ipc/pronostico.json", pronostico), false);
  const poblacion = await leer("poblacion/proyecciones.json");
  poblacion.pais.pop();
  assert.equal(validarDatos("poblacion/proyecciones.json", poblacion), false);
  assert.equal(validarDatos("otro.json", {}), false);
});

test("el escenario de El Niño y el ajuste afectan solo los valores esperados", async () => {
  const modelo = await leer("ipc/pronostico.json");
  const base = proyectar(modelo, 3, new Set());
  const escenario = proyectar(modelo, 3, new Set([2]));
  const ajustado = proyectar(modelo, 3, new Set(), 1.05);
  assert.equal(escenario[0].pronostico, base[0].pronostico);
  assert.equal(escenario[2].pronostico, base[2].pronostico);
  assert.ok(Math.abs(escenario[1].pronostico / base[1].pronostico - Math.exp(modelo.el_nino.coeficiente)) < 1e-12);
  assert.ok(Math.abs(ajustado[0].inferior_95 / base[0].inferior_95 - 1.05) < 1e-12);
  assert.ok(base.every((m) => m.inferior_95 < m.inferior_80 && m.inferior_80 < m.pronostico && m.pronostico < m.superior_80 && m.superior_80 < m.superior_95));
});

test("los enlaces codifican parámetros y omiten filtros vacíos", async () => {
  const { enlace, reemplazarParametros } = await import("../src/navegacion.ts");
  assert.equal(enlace("explorar", { depto: 8, tema: "salud y vida", op: null }), "#/?depto=8&tema=salud+y+vida");
  let reemplazo;
  globalThis.window = { location: { hash: "#/ipc?depto=1" }, history: { replaceState: (_estado, _titulo, hash) => { reemplazo = hash; } } };
  try {
    reemplazarParametros({ depto: 8, meses: 12 });
    assert.equal(reemplazo, "#/calculadora?depto=8&meses=12");
  } finally {
    delete globalThis.window;
  }
});


test("volver a la URL inicial representa una nueva navegación", async () => {
  const { siguienteUbicacion } = await import("../src/navegacion.ts");
  const inicial = { ruta: "explorar", parametros: new URLSearchParams("depto=1"), revision: 0 };
  // Los cambios de filtros usan replaceState y no actualizan la ubicación del componente raíz.
  const regreso = siguienteUbicacion(inicial, { ruta: "explorar", parametros: new URLSearchParams("depto=1") });
  assert.equal(regreso.parametros.get("depto"), "1");
  assert.equal(regreso.revision, 1);
});


test("rechaza enlaces no web o con credenciales en cada tipo de fuente", async () => {
  const original = await leer("catalogo.json");
  const casos = [
    ["publicaciones", "url_publicacion"], ["publicaciones", "url_descarga"],
    ["operaciones", "url_portal"], ["operaciones", "url_descripcion"],
    ["operaciones", "url_metodologia"], ["ediciones", "url_portal"],
    ["ediciones", "url_metodologia"], ["relaciones", "url_respaldo"], ["temas", "url_portal"],
  ];
  for (const [tabla, campo] of casos) {
    for (const valor of ["javascript:alert(1)", "//example.com", "https://usuario:clave@example.com", "https://example.com/ mal", "https://example.com\\@evil.com"]) {
      const catalogo = structuredClone(original);
      catalogo[tabla][0][campo] = valor;
      assert.equal(validarDatos("catalogo.json", catalogo), false, `${tabla}.${campo}: ${valor}`);
    }
  }
  const poblacion = await leer("poblacion/proyecciones.json");
  poblacion.url = "data:text/html,ejemplo";
  assert.equal(validarDatos("poblacion/proyecciones.json", poblacion), false);
});
