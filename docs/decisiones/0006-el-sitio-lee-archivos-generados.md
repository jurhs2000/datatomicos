# 0006. El sitio lee archivos generados y versionados

- **Fecha:** 2026-11-25
- **Estado:** aceptada

## Contexto

El sitio necesita el catálogo, la lista de territorios y los resultados del modelo del IPC. Esos archivos se podían generar al publicar el sitio, con Python en un servicio de integración continua, o generar localmente y guardarlos en el repositorio.

## Decisión

- El catálogo se mantiene en CSV (`catalogo/publicaciones.csv`). `pipeline/construir_catalogo.py` lo valida y genera `web/public/datos/catalogo.json`.
- Los resultados del modelo los genera la última celda del notebook del IPC en `web/public/datos/ipc/`.
- Los archivos de `web/public/datos/` se versionan. Son pequeños y derivados; nunca se editan a mano.

## Consecuencias

- El sitio se puede desarrollar y publicar sin instalar Python.
- Publicar no depende de que el modelo o la descarga corran en la nube.
- Cada cambio en los datos queda visible en el historial del repositorio.
- Si los datos crecen o se actualizan con frecuencia, conviene pasar la generación a integración continua sin cambiar el formato de los archivos.
