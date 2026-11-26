# 0010. Acceso a cifras y productos dentro de una misma ficha

- **Fecha:** 2026-11-26
- **Estado:** propuesta en evaluación

## Contexto

El botón para mostrar las cifras estaba dentro de la lista de productos, lejos de las tarjetas. Consultar un resultado requería bajar por la lista y volver manualmente al comienzo de la ficha.

## Propuesta

Conservar la ficha de un mismo lugar y periodo con dos vistas: En cifras y Productos. Una navegación local permanece accesible al desplazarse. En cifras ofrece un selector de los productos disponibles, obtenido del índice de datos.

Ver cifras desde un producto añade ese producto a la selección, abre En cifras y lleva el foco y la lectura a su tarjeta. La selección se conserva al cambiar la consulta y al alternar vistas. Al regresar a una vista se recupera su posición de lectura.

## Consecuencias

No hay una página nueva ni filtros duplicados. Los productos mantienen su enlace a la fuente. Los paneles ocultos quedan fuera de la navegación por teclado y las gráficas esperan a tener ancho visible antes de dibujarse. Las cifras se activan o desactivan desde su selector; Ver cifras en la lista funciona como acceso al resultado.
