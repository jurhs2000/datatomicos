# AGENTS.md

Guía para agentes de IA que trabajen en este repositorio.

## Proyecto

Herramienta del equipo Datatómicos para el Datatón INE 2026 (categoría Tecnológica y ciencias de datos). Permite buscar las publicaciones del Instituto Nacional de Estadística (INE) de Guatemala por tiempo y territorio, e incluye el IPC con una proyección a futuro. El contexto completo para personas está en `README.md`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `catalogo/` | Metadatos de las publicaciones del INE; la interfaz lo lee |
| `pipeline/` | Descarga y normalización de datos del portal |
| `modelos/ipc/` | Proyección del IPC y coeficientes departamentales (notebook, insumos y script de preparación) |
| `datos/` | Archivos locales; `datos/crudos/` no se versiona y se regenera con scripts |
| `web/` | Sitio estático |
| `docs/` | `arquitectura.md` y registro de decisiones en `docs/decisiones/` |

Antes de cambiar la estructura o tomar una decisión de diseño, revisar `docs/decisiones/`. Una decisión nueva se registra con el siguiente número.

## Principios de diseño

- **El catálogo de publicaciones es la pieza central.** Toda publicación se describe con el mismo esquema (periodo, nivel territorial, base metodológica, fuente, fecha de descarga). Agregar una publicación nueva no debería requerir cambios en la interfaz.
- **Datos separados de la interfaz.** El procesamiento de datos produce archivos que la interfaz consume.
- **Lo oficial y lo estimado, siempre distinguibles.** Cualquier cálculo propio (proyecciones, coeficientes) se identifica como estimación del equipo, con su método.

## Reglas sobre datos

- Usar como fuente principal los datos publicados en el portal del INE (`www.ine.gob.gt`, `datos.ine.gob.gt`). Toda fuente nueva se registra en el README con su enlace, licencia y fecha de descarga.
- Citar al INE como fuente en la herramienta y en la documentación.
- Respetar las definiciones y metadatos oficiales; no presentar resultados de forma que induzcan a error.
- Respetar el secreto estadístico: nada que intente identificar personas, hogares o empresas.
- No incluir credenciales, contraseñas ni llaves de acceso en el código.

## Convenciones

- Documentación, comentarios y mensajes de commit en español.
- Archivos de texto en UTF-8. Fechas en formato ISO (`aaaa-mm-dd`).
- Cada dependencia nueva se agrega a la tabla de componentes de terceros del README, con su licencia.
- El uso de IA generativa se declara en el README.
