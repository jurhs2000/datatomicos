# 0008. El catálogo se organiza por operación, edición y publicación

- **Fecha:** 2026-11-25
- **Estado:** aceptada
- **Amplía:** [0003](0003-catalogo-de-publicaciones.md)

## Contexto

El catálogo describía cada publicación por separado, con un tema propio y un tipo que mezclaba el tipo de operación (encuesta, índice) con el tipo de producto. Así no se podía responder de dónde sale una cifra ni qué operaciones se alimentan de otras, y los temas no coincidían con los del portal del INE.

El INE produce sus estadísticas con operaciones estadísticas: censos, encuestas, índices, registros administrativos y estimaciones. Cada una se realiza en ediciones (un levantamiento o una base metodológica) y se difunde en publicaciones. Algunas usan insumos de otras: por ejemplo, la ENIGH aporta los ponderadores del IPC y el Censo 2018 es la población base de las proyecciones.

## Decisión

- La jerarquía del catálogo es **operación › edición › publicación**, en cuatro tablas nuevas en `catalogo/`: `operaciones.csv`, `ediciones.csv`, `relaciones.csv` y `temas.csv` (los 22 temas de «Estadísticas por tema» del portal, en su orden).
- Cada publicación declara su operación, las ediciones que cubre y su nivel de procesamiento (microdatos, cuadros, indicadores o informes).
- **El tipo y el tema de una publicación se derivan de su operación** y no se escriben en `publicaciones.csv`, para que no puedan contradecirse.
- Cada relación entre operaciones enlaza el documento del INE que la respalda, con su página, y declara si el documento la dice explícitamente (`confirmado`) o si se deduce de lo que dice (`probable`).
- Las descripciones de operaciones indican si citan textualmente al INE o si son un resumen del equipo.
- `pipeline/construir_catalogo.py` valida que toda referencia entre tablas exista y sea coherente (por ejemplo, que la edición de una publicación sea de su misma operación) y escribe las cinco tablas en `web/public/datos/catalogo.json`.

Las columnas de cada tabla están en [`catalogo/README.md`](../../catalogo/README.md).

## Consecuencias

- El sitio puede filtrar por tema del portal y por origen (tipo de operación y operación), y mostrar de qué operación y edición sale cada producto.
- Las operaciones que el portal no ubica en ningún tema (varias encuestas, entre ellas la ENIGH) quedan accesibles por su origen.
- Agregar una publicación exige asignarle una operación existente; si no existe, se agrega primero a `operaciones.csv`.
- Las relaciones salen de leer documentos metodológicos. Las que no se han documentado no aparecen, y el nivel de procesamiento de algunas publicaciones se infirió y está marcado como tal.
