# 0003. Un catálogo de publicaciones como pieza central

- **Fecha:** 2026-11-25
- **Estado:** aceptada

## Contexto

Los metadatos del portal de datos abiertos (`datos.ine.gob.gt`, basado en CKAN) no tienen campos de cobertura temporal ni de nivel territorial. La interfaz podía construirse directamente sobre los datos de cada publicación o sobre una capa de metadatos común.

## Decisión

La pieza central es un catálogo de publicaciones del INE en texto plano, versionado en `catalogo/`. Cada entrada describe una publicación con su periodo, su nivel territorial mínimo, su base o versión metodológica, su fuente y su fecha de descarga. La interfaz lee el catálogo.

## Consecuencias

- Agregar una publicación es agregar una entrada, más sus datos si se van a mostrar. No requiere cambiar código.
- Parte del catálogo se puede llenar desde la API del portal (conjuntos, recursos, enlaces, fechas). La cobertura y el nivel territorial se completan a mano o con reglas.
- Lo que no se pueda describir con el esquema común obliga a revisar el esquema antes de incorporarse.
