import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { productoDePrueba } from "./fixtures/cifras.mjs";

// Verifica el HTML de React. Los efectos de Plot y las interacciones requieren navegador.
test("las tarjetas renderizan KPI, procedencia, cobertura y niveles con el mismo componente", async (t) => {
  const servidor = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { TarjetaProducto } = await servidor.ssrLoadModule("/src/componentes/TarjetaProducto.tsx");
    const { TarjetaCifra } = await servidor.ssrLoadModule("/src/componentes/TarjetaCifra.tsx");
    const { NotasCifra } = await servidor.ssrLoadModule("/src/componentes/NotasCifra.tsx");
    const renderizar = (producto, lugar, desde, hasta) => renderToStaticMarkup(React.createElement(TarjetaProducto, { producto, lugar, desde, hasta }));
    const departamento = { nivel: "departamento", codigo: 8, nombre: "Totonicapán" };
    const municipio = { nivel: "municipio", codigo: 805, nombre: "Momostenango", departamento: { codigo: 8, nombre: "Totonicapán" } };

    await t.test("las notas se comparten con la tarjeta base y se omiten si no hay aclaraciones", () => {
      const html = renderToStaticMarkup(React.createElement(TarjetaCifra, {
        titulo: "Cifra de prueba", cifra: "10", unidad: "registros", anio: 2025,
        nota: "Esta cifra corresponde al departamento.", origen: { texto: "Fuente de prueba" },
      }));
      assert.match(html, /<aside class="notas-cifra" aria-label="Notas de lectura">/);
      assert.match(html, /<li>Esta cifra corresponde al departamento\.<\/li>/);
      assert.equal(renderToStaticMarkup(React.createElement(NotasCifra, { notas: [null, false, undefined, ""] })), "");
    });

    await t.test("distingue columnas anuales de proporciones y conserva sus denominadores", () => {
      const html = renderizar(productoDePrueba(), municipio, 2022, 2025);
      assert.match(html, /Columnas de Registros, Momostenango, en registros/);
      assert.match(html, /El sombreado marca 2022–2025\. Año destacado: 2025\./);
      assert.match(html, /Barra sobre una escala de 0 a 100 %/);
      assert.match(html, /Base del porcentaje: 1 de 4 registros\./);
      assert.match(html, /Ver evolución anual y datos: Porcentaje de prueba/);
      assert.match(html, /<th scope="col">Numerador<\/th><th scope="col">Denominador<\/th>/);
      assert.match(html, /<td>25.0<\/td><td>1<\/td><td>4<\/td>/);
    });

    await t.test("un producto adicional muestra todos sus KPI, edición y alternativa tabular", () => {
      const producto = productoDePrueba();
      producto.edicion = "Edición de prueba";
      producto.kpis.push({ id: "extra", nombre: "Indicador adicional", tipo: "tasa", unidad: "por mil" });
      producto.filas.push({ kpi: "extra", nivel: "municipio", territorio: 805, anio: 2025, valor: 12.5 });
      const html = renderizar(producto, municipio, 2022, 2025);
      assert.match(html, /<strong>1,500<\/strong>/);
      assert.match(html, /<strong>25.0<\/strong>/);
      assert.match(html, /Indicador adicional/);
      assert.match(html, /<strong>12.5<\/strong>/);
      assert.match(html, /Operación de prueba · Edición de prueba · INE/);
      assert.match(html, /<caption>Registros · Momostenango · registros<\/caption>/);
      assert.match(html, /<td>Sin dato<\/td>/);
      assert.match(html, /href="https:\/\/datos.ine.gob.gt\/dataset\/producto-prueba"/);
    });

    await t.test("el HTML avisa al usar un nivel superior y un año fuera del rango", () => {
      const html = renderizar(productoDePrueba(), { ...municipio, codigo: 801, nombre: "Otro municipio" }, 2018, 2020);
      assert.match(html, /Se muestran cifras de Totonicapán \(nivel departamental\)/);
      assert.match(html, /Este producto cubre 2022–2025/);
      assert.match(html, /<strong>4,000<\/strong>/);
      assert.match(html, /Sin datos disponibles para Otro municipio, Totonicapán ni para un nivel superior/);
    });

    let nacimientos;
    let establecimientos;
    try {
      [nacimientos, establecimientos] = await Promise.all(["nacimientos", "establecimientos"].map(async (nombre) =>
        JSON.parse(await readFile(new URL(`../public/datos/cifras/${nombre}.json`, import.meta.url), "utf8")),
      ));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await t.test("referencias de los archivos generados", { skip: "Faltan los productos generados por el pipeline." }, () => {});
      return;
    }

    await t.test("Totonicapán: nacimientos 2022 y establecimientos 2025", () => {
      const nac = renderizar(nacimientos, departamento, 2018, 2022);
      for (const valor of ["12,007", "39.2", "14.7"]) assert.ok(nac.includes(`<strong>${valor}</strong>`), valor);
      assert.match(nac, /Estadísticas vitales · INE/);
      assert.match(nac, /residencia de la madre ignorada o en el extranjero/);
      const est = renderizar(establecimientos, departamento, 2018, 2025);
      for (const valor of ["1,576", "85.3", "87.6"]) assert.ok(est.includes(`<strong>${valor}</strong>`), valor);
      assert.match(est, /Estadísticas de educación · INE/);
    });

    await t.test("Momostenango: establecimientos 2022 y rango 2019–2021", () => {
      const html = renderizar(establecimientos, municipio, 2022, 2022);
      assert.match(html, /<strong>332<\/strong>/);
      assert.match(html, /<strong>86.1<\/strong>/);
      const fuera = renderizar(establecimientos, municipio, 2019, 2021);
      assert.match(fuera, /Este producto cubre 2022–2025/);
      assert.match(fuera, /<strong>332<\/strong>/);
      const nac = renderizar(nacimientos, municipio, 2019, 2021);
      const fila = nacimientos.filas.find((f) => f.kpi === "registrados" && f.nivel === "municipio" && f.territorio === 805 && f.anio === 2021);
      assert.ok(nac.includes(`<strong>${fila.valor.toLocaleString("es-GT")}</strong>`));
    });

    await t.test("el país usa su fila preparada y muestra 2022 fuera de cobertura", () => {
      const html = renderizar(establecimientos, { nivel: "pais" }, 2018, 2020);
      const fila = establecimientos.filas.find((f) => f.kpi === "registrados" && f.nivel === "pais" && f.anio === 2022);
      assert.ok(html.includes(`<strong>${fila.valor.toLocaleString("es-GT")}</strong>`));
      assert.match(html, /Este producto cubre 2022–2025/);
      assert.match(html, /Todo el país/);
    });
  } finally {
    await servidor.close();
  }
});
