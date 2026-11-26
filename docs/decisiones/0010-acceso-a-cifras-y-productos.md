# 0010. Acceso a cifras y productos dentro de una misma ficha

- **Fecha:** 2026-11-26
- **Estado:** aceptada

## Contexto

El botón para mostrar las cifras estaba dentro de la lista de productos, lejos de las tarjetas. Consultar un resultado requería bajar por la lista y volver manualmente al comienzo de la ficha.

## Decisión

Conservar la ficha de un mismo lugar y periodo con dos vistas: En cifras y Productos. Una navegación local permanece accesible al desplazarse. En cifras ofrece un selector de los productos disponibles, obtenido del índice de datos.

Ver cifras desde un producto añade ese producto a la selección, abre En cifras y lleva el foco y la lectura a su tarjeta. La selección se conserva al cambiar la consulta y al alternar vistas. Al regresar a una vista se recupera su posición de lectura.

En escritorio se desplaza la lista interna; si la navegación de la ficha o el comienzo del destino quedaron fuera de la pantalla, también se revela la ficha en la ventana. La página conserva su posición cuando la navegación y el comienzo del destino ya son visibles.

Cada tarjeta de cifras identifica por título su producto de origen y permite abrirlo en Productos. Si no coincide con el periodo o los filtros activos, se muestra como origen fuera de la consulta, sin cambiar los filtros, el conteo o la selección de cifras. Cuando sí coincide, se enfoca su entrada existente en la lista.

## Consecuencias

No hay una página nueva ni filtros duplicados. Los productos mantienen su enlace a la fuente. Los paneles ocultos quedan fuera de la navegación por teclado y las gráficas esperan a tener ancho visible antes de dibujarse. Las cifras se activan o desactivan desde su selector; Ver cifras en la lista funciona como acceso al resultado.
