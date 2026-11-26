# Catálogo de publicaciones

Metadatos de cada publicación del INE que entra al sitio. Es la pieza que lee la interfaz (ver [docs/decisiones/0003](../docs/decisiones/0003-catalogo-de-publicaciones.md)). Agregar una publicación es agregar una fila a `publicaciones.csv` y correr:

```bash
python pipeline/construir_catalogo.py
```

El script valida el archivo y genera `web/public/datos/catalogo.json`. Si una fila no cumple el esquema, se detiene y dice cuál y por qué.

## Archivos

| Archivo | Una fila es |
|---|---|
| `publicaciones.csv` | Una publicación: lo que se abre en el portal con una URL propia (un conjunto de `datos.ine.gob.gt` o una página de `www.ine.gob.gt`) |
| `operaciones.csv` | Una operación estadística: el censo, la encuesta, el índice, el registro o la estimación de la que sale cada publicación |
| `ediciones.csv` | Una edición de una operación: cada levantamiento en censos y encuestas, cada base metodológica en índices y estimaciones |
| `relaciones.csv` | Una operación que usa un insumo de otra operación o de una institución externa |
| `temas.csv` | Un tema de «Estadísticas por tema» del portal del INE, en su orden |
| `departamentos.csv` | Códigos y nombres de los 22 departamentos, con la codificación del INE |

La jerarquía es **operación › edición › publicación**. El tema y el tipo de cada publicación se derivan de su operación: no se escriben en `publicaciones.csv`.

Formato: separador coma, UTF-8, fechas `aaaa-mm-dd`. Las columnas que admiten varios valores los separan con `|`. Se puede editar en Excel si se guarda como «CSV UTF-8».

El script valida que toda llave exista en su tabla: la `operacion` y las `edicion` de cada publicación (y que la edición sea de esa operación), el `tema_portal` de cada operación y las operaciones y ediciones de cada relación.

## Columnas de `publicaciones.csv`

| Columna | Obligatoria | Contenido |
|---|---|---|
| `id` | Sí | Identificador único, en minúsculas y con guiones |
| `titulo` | Sí | Título tal como lo publica el INE |
| `direccion_ine` | No | Dirección del INE que la produce; vacío si no se identificó |
| `operacion` | Sí | Operación estadística de la que sale (`id` de `operaciones.csv`) |
| `edicion` | No | Ediciones que cubre (`id` de `ediciones.csv`, de la misma operación), separadas por `\|`. Vacío en registros administrativos |
| `nivel_procesamiento` | No | `microdatos` (un registro por unidad observada), `cuadros` (agregados tabulados), `indicadores` (índices, tasas y estimaciones con definición oficial) o `informes` (PDF, infografías, tableros); varios se separan con `\|` |
| `nivel_determinado_por` | No | De dónde sale el nivel de procesamiento: `contenido` (columnas del archivo), `titulo`, `formato` o `supuesto` |
| `periodo_inicio` | Sí | Primer año con datos (`aaaa`) |
| `periodo_fin` | Sí | Último año con datos (`aaaa`); igual a `periodo_inicio` si es un solo año |
| `periodicidad` | No | `mensual`, `trimestral`, `semestral`, `anual`, `quinquenal`, `decenal`, `unica` o `irregular` |
| `nivel_territorial_minimo` | Sí | `nacional`, `region`, `departamento`, `municipio`, `lugar_poblado` o `sin_determinar` si falta revisarlo |
| `base_metodologica` | No | Periodo base o versión metodológica, si aplica |
| `url_publicacion` | Sí | Página de la publicación en el portal |
| `url_descarga` | No | Enlace directo al archivo |
| `formato` | No | Formatos disponibles, separados por `\|` |
| `en_ckan` | Sí | `si` si está en `datos.ine.gob.gt`, `no` si solo se descarga desde `www.ine.gob.gt` |
| `licencia` | No | Licencia declarada; vacío si el portal no la declara |
| `fecha_descarga` | No | Fecha en que el equipo descargó o consultó la publicación |
| `datos` | No | Datos que muestra el sitio (`ipc`, `poblacion`); vacío si solo aparece en el catálogo |
| `como_se_determino` | No | De dónde salen el periodo y el nivel territorial: `metadatos`, `contenido` (columnas del archivo), `titulo` o `supuesto`. El sitio marca los `supuesto` como pendientes de verificar |
| `notas` | No | Aclaraciones |

## Columnas de `operaciones.csv`

| Columna | Obligatoria | Contenido |
|---|---|---|
| `id` | Sí | Identificador único |
| `siglas` | No | Siglas, si las tiene (ENCOVI, IPC) |
| `nombre` | Sí | Nombre completo |
| `tipo_operacion` | Sí | `censo`, `encuesta`, `indice`, `registro_administrativo` o `estimacion` |
| `descripcion` | Sí | Qué mide |
| `descripcion_origen` | Sí | `ine` si la descripción cita entre comillas la página de `url_descripcion`; `propia` si es un resumen del equipo. El sitio no presenta las `propia` como citas del INE |
| `url_descripcion` | No | Página de donde sale la descripción |
| `direccion_ine`, `departamento_ine` | No | Unidad del INE responsable |
| `institucion_fuente` | No | Institución que entrega los registros, en registros administrativos |
| `periodicidad` | No | Mismos valores que en `publicaciones.csv` |
| `tema_portal` | No | Tema del portal (`id` de `temas.csv`); vacío si la operación no está en ningún tema |
| `menu_portal` | No | Menús del portal donde aparece: `Estadísticas por tema`, `Encuestas`, `Servicios estadísticos` o `Solo en datos.ine.gob.gt`, separados por `\|` |
| `url_portal` | Sí | Página de la operación en el portal |
| `url_metodologia` | No | Documento metodológico |
| `fecha_consulta` | No | Fecha en que se consultó el portal |

## Columnas de `ediciones.csv`

| Columna | Obligatoria | Contenido |
|---|---|---|
| `id` | Sí | Identificador único |
| `operacion` | Sí | Operación a la que pertenece (`id` de `operaciones.csv`) |
| `nombre` | Sí | Nombre de la edición |
| `anio_inicio`, `anio_fin` | Sí | Años que cubre: el del levantamiento o los de vigencia de la base |
| `base_metodologica` | No | Periodo base, en índices |
| `url_portal`, `url_metodologia` | No | Página y metodología de la edición |
| `fecha_consulta` | No | Fecha de consulta |
| `como_se_determino` | No | `portal`, `metodologia` (documento metodológico) o `catalogo` (deducida de las publicaciones) |

Los registros administrativos no tienen ediciones mientras no se documente un cambio de metodología: sus años están en el periodo de cada publicación.

## Columnas de `relaciones.csv`

Una fila dice que `operacion` (y, si se sabe, su `edicion`) usa algo de `usa_insumo_de` (y su `edicion_insumo`) o de `insumo_externo`. Para saber qué deriva de una operación, se busca en `usa_insumo_de`.

| Columna | Obligatoria | Contenido |
|---|---|---|
| `id` | Sí | Identificador único |
| `operacion`, `edicion` | Sí, No | Operación (y edición) que usa el insumo |
| `usa_insumo_de`, `edicion_insumo` | No | Operación (y edición) del INE de la que viene el insumo |
| `insumo_externo` | No | Institución externa, si el insumo no es del INE; varias se separan con `\|`. Cada fila tiene `usa_insumo_de` o `insumo_externo`, no los dos |
| `tipo_relacion` | Sí | `ponderadores`, `estructura_de_consumo`, `precios`, `marco_muestral`, `diseno_muestral`, `poblacion_base`, `componentes_demograficos`, `validacion`, `deflactor`, `registros`, `insumo`, `metodologia` o `sucede_a` |
| `descripcion` | Sí | Qué dice el documento |
| `url_respaldo`, `pagina` | Sí, No | Documento que lo respalda y página del archivo PDF (no la impresa) |
| `confianza` | Sí | `confirmado` (el documento lo dice), `probable` (se deduce de lo que dice) o `hipótesis` |
| `fecha_consulta` | No | Fecha de consulta |

## Columnas de `temas.csv`

`id`, `nombre` (texto del botón en el portal), `orden_portal` (posición en «Estadísticas por tema»), `url_portal` y `fecha_consulta`.
