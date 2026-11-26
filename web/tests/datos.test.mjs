import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validarDatos } from "../src/validarDatos.ts";
import { proyectar } from "../src/proyeccionIpc.ts";

const leer = async (ruta) => JSON.parse(await readFile(new URL(`../public/datos/${ruta}`, import.meta.url), "utf8"));
const rutas = ["catalogo.json", "territorio/departamentos.json", "territorio/departamentos.geojson", "territorio/municipios.geojson", "poblacion/proyecciones.json", "ipc/serie.json", "ipc/pronostico.json", "ipc/validacion.json", "ipc/coeficientes.json"];

test("los archivos generados cumplen los contratos consumidos por la interfaz", async () => {
  for (const ruta of rutas) assert.equal(validarDatos(ruta, await leer(ruta)), true, ruta);
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
