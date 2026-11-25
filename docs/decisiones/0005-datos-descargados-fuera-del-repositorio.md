# 0005. Los datos descargados no se versionan

- **Fecha:** 2026-11-25
- **Estado:** aceptada

## Contexto

Algunos archivos del portal son grandes (los precios recolectados de un año ocupan unos 70 MB en CSV) y cada año se publica uno nuevo. Otros insumos son pequeños y fueron preparados por el equipo, por lo que no se pueden descargar de ninguna parte.

## Decisión

- Lo que se descarga del portal no se versiona. Se guarda en `datos/crudos/` (excluida en `.gitignore`) y lo regenera un script.
- Los insumos pequeños preparados por el equipo sí se versionan junto al código que los usa.
- Los scripts y notebooks resuelven las rutas a partir de la raíz del repositorio.

## Consecuencias

- El repositorio no crece con los datos y siempre se trabaja con la versión publicada por el INE.
- Reproducir un análisis requiere conexión al portal la primera vez.
- Cada publicación nueva necesita su forma de descarga, que vivirá en `pipeline/`.
