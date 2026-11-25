# Catálogo de publicaciones

Metadatos de cada publicación del INE que entra al sitio. Es la pieza que lee la interfaz (ver [docs/decisiones/0003](../docs/decisiones/0003-catalogo-de-publicaciones.md)). Agregar una publicación es agregar una fila a `publicaciones.csv` y correr:

```bash
python pipeline/construir_catalogo.py
```

El script valida el archivo y genera `web/public/datos/catalogo.json`. Si una fila no cumple el esquema, se detiene y dice cuál y por qué.

## Archivos

| Archivo | Contenido |
|---|---|
| `publicaciones.csv` | Una fila por publicación |
| `departamentos.csv` | Códigos y nombres de los 22 departamentos, con la codificación del INE |

Formato: separador coma, UTF-8, fechas `aaaa-mm-dd`. Se puede editar en Excel si se guarda como «CSV UTF-8».

## Columnas de `publicaciones.csv`

| Columna | Obligatoria | Contenido |
|---|---|---|
| `id` | Sí | Identificador único, en minúsculas y con guiones |
| `titulo` | Sí | Título tal como lo publica el INE |
| `tipo_publicacion` | Sí | `encuesta`, `indice`, `censo`, `registro_administrativo` u `otro` |
| `direccion_ine` | Sí | Dirección del INE que la produce |
| `tema` | Sí | Tema principal |
| `periodo_inicio` | Sí | Primer año con datos (`aaaa`) |
| `periodo_fin` | Sí | Último año con datos (`aaaa`); igual a `periodo_inicio` si es un solo año |
| `periodicidad` | Sí | `mensual`, `trimestral`, `anual`, `quinquenal`, `decenal` o `unica` |
| `nivel_territorial_minimo` | Sí | `nacional`, `region`, `departamento`, `municipio` o `lugar_poblado` |
| `base_metodologica` | No | Periodo base o versión metodológica, si aplica |
| `url_publicacion` | Sí | Página de la publicación en el portal |
| `url_descarga` | No | Enlace directo al archivo |
| `formato` | No | Formatos disponibles, separados por `\|` |
| `en_ckan` | Sí | `si` si está en `datos.ine.gob.gt`, `no` si solo se descarga desde `www.ine.gob.gt` |
| `licencia` | No | Licencia declarada; vacío si el portal no la declara |
| `fecha_descarga` | No | Fecha en que el equipo descargó o consultó la publicación |
| `datos` | No | Sección del sitio que muestra sus datos (por ejemplo `ipc`); vacío si solo aparece en el catálogo |
| `notas` | No | Aclaraciones |
