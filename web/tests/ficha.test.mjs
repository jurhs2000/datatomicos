import test from "node:test";
import assert from "node:assert/strict";
import { iniciarFicha, productoDeOrigenFueraDeConsulta, reducirFicha } from "../src/ficha.ts";

test("Ver cifras desde la lista abre y solicita el enfoque sin desactivar al repetir", () => {
  let estado = reducirFicha(iniciarFicha(), { tipo: "vista", vista: "productos" });
  estado = reducirFicha(estado, { tipo: "abrir", producto: "primero" });
  assert.equal(estado.vista, "cifras");
  assert.equal(estado.destino, "primero");
  assert.deepEqual([...estado.seleccion], ["primero"]);
  const revision = estado.revision;
  estado = reducirFicha(estado, { tipo: "abrir", producto: "primero" });
  assert.equal(estado.seleccion.size, 1);
  assert.ok(estado.revision > revision, "permite volver a enfocar la misma tarjeta");
});

test("alternar vistas mantiene varios productos elegidos", () => {
  let estado = reducirFicha(iniciarFicha(), { tipo: "abrir", producto: "primero" });
  estado = reducirFicha(estado, { tipo: "abrir", producto: "segundo" });
  const seleccion = estado.seleccion;
  estado = reducirFicha(estado, { tipo: "vista", vista: "productos" });
  assert.equal(estado.destino, null);
  assert.equal(estado.seleccion, seleccion);
  estado = reducirFicha(estado, { tipo: "vista", vista: "cifras" });
  assert.deepEqual([...estado.seleccion], ["primero", "segundo"]);
});

test("abrir el origen solicita el producto sin modificar las cifras seleccionadas", () => {
  const anterior = reducirFicha(iniciarFicha(), { tipo: "abrir", producto: "primero" });
  const estado = reducirFicha(anterior, { tipo: "origen", producto: "primero" });
  assert.equal(estado.vista, "productos");
  assert.equal(estado.destino, "primero");
  assert.equal(estado.seleccion, anterior.seleccion);
  assert.ok(estado.revision > anterior.revision);
  const repetido = reducirFicha(estado, { tipo: "origen", producto: "primero" });
  assert.ok(repetido.revision > estado.revision);
});

test("un origen filtrado se presenta aparte sin duplicar ni alterar la consulta", () => {
  const productos = [{ id: "primero" }, { id: "segundo" }];
  const filtrados = [productos[1]];
  const estado = reducirFicha(iniciarFicha(), { tipo: "origen", producto: "primero" });
  assert.equal(productoDeOrigenFueraDeConsulta(estado, productos, filtrados), productos[0]);
  assert.deepEqual(filtrados, [productos[1]]);
  assert.equal(productoDeOrigenFueraDeConsulta(estado, productos, productos), undefined);
  assert.equal(productoDeOrigenFueraDeConsulta(iniciarFicha(), productos, filtrados), undefined);
  assert.equal(productoDeOrigenFueraDeConsulta({ ...estado, destino: "ausente" }, productos, filtrados), undefined);
});

test("el selector puede quitar un producto conservando los demás y el estado anterior", () => {
  let estado = reducirFicha(iniciarFicha(), { tipo: "alternar", producto: "primero" });
  estado = reducirFicha(estado, { tipo: "alternar", producto: "segundo" });
  const anterior = estado;
  estado = reducirFicha(estado, { tipo: "alternar", producto: "primero" });
  assert.deepEqual([...estado.seleccion], ["segundo"]);
  assert.deepEqual([...anterior.seleccion], ["primero", "segundo"]);
  assert.equal(estado.revision, anterior.revision, "quitar no solicita otro desplazamiento");
});

test("cada ficha empieza sin selección compartida y cambiar a la vista activa no la reinicia", () => {
  const inicial = iniciarFicha();
  const otra = iniciarFicha();
  assert.notEqual(inicial.seleccion, otra.seleccion);
  assert.equal(reducirFicha(inicial, { tipo: "vista", vista: "cifras" }), inicial);
  const conProducto = reducirFicha(inicial, { tipo: "abrir", producto: "nuevo-producto" });
  assert.equal(inicial.seleccion.size, 0);
  assert.ok(conProducto.seleccion.has("nuevo-producto"));
});
