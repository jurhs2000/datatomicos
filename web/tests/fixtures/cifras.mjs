// Datos sintéticos: prueban el contrato sin depender de descargas del portal.
export function productoDePrueba() {
  return {
    orden: 1,
    producto: "producto-prueba",
    titulo_catalogo: "PRODUCTO DE PRUEBA",
    operacion: "operacion-prueba",
    operacion_nombre: "Operación de prueba",
    edicion: null,
    url: "https://datos.ine.gob.gt/dataset/producto-prueba",
    titulo: "Producto de prueba",
    fuente: "Datos sintéticos para pruebas",
    fecha_descarga: "2026-11-26",
    nota: "Datos sintéticos, sin uso estadístico.",
    nivel_minimo: "municipio",
    anios: [2022, 2023, 2025],
    kpis: [
      { id: "total", nombre: "Registros", unidad: "registros", tipo: "conteo" },
      { id: "parte", nombre: "Porcentaje de prueba", unidad: "%", tipo: "porcentaje" },
    ],
    filas: [
      { kpi: "total", nivel: "municipio", territorio: 805, anio: 2022, valor: 1234 },
      { kpi: "total", nivel: "municipio", territorio: 805, anio: 2025, valor: 1500 },
      { kpi: "parte", nivel: "municipio", territorio: 805, anio: 2022, valor: 25, numerador: 1, denominador: 4 },
      { kpi: "total", nivel: "departamento", territorio: 8, anio: 2022, valor: 4000 },
      { kpi: "total", nivel: "departamento", territorio: 8, anio: 2025, valor: 5000 },
      { kpi: "total", nivel: "pais", territorio: 0, anio: 2022, valor: 80000 },
      { kpi: "total", nivel: "pais", territorio: 0, anio: 2025, valor: 90000 },
    ],
  };
}
