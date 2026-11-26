# Pipeline de datos

Descarga los datos, los normaliza y produce los archivos que consume el sitio en `web/public/datos/`. Se corre desde la raíz del repositorio con el entorno `series-tiempo-geo`.

| Script | Lee | Escribe |
|---|---|---|
| `construir_catalogo.py` | `catalogo/publicaciones.csv`, `catalogo/departamentos.csv` | `catalogo.json`, `territorio/departamentos.json` |
| `preparar_territorio.py` | Límites de HDX (COD-AB) | `territorio/departamentos.geojson`, `territorio/municipios.geojson` |
| `preparar_poblacion.py` | Proyecciones de población del INE 2015-2030 | `poblacion/proyecciones.json` |
| `preparar_nacimientos.py` | Estadísticas vitales, nacimientos 2018-2025 (datastore 2018-2022, XLSX 2023-2025) | `cifras/nacimientos.json` |
| `preparar_establecimientos.py` | Establecimientos de educación formal 2022-2025 (datastore) | `cifras/establecimientos.json` |

`comun.py` tiene las rutas y utilidades compartidas. Lo descargado se guarda en `datos/crudos/` y no se versiona.

## Cifras por territorio

Las cifras de los productos del catálogo que tienen resultados por lugar y año se escriben todas en el mismo formato, en `web/public/datos/cifras/`. El sitio no tiene código propio para cada producto: sumar uno es escribir un script que produzca este formato.

- `cifras/indice.json`: lista de los archivos de cifras, en el orden en que se muestran (`["nacimientos", "establecimientos"]`). Se regenera cada vez que corre un script, ordenado por el campo `orden` de cada archivo.
- `cifras/<nombre>.json`: un archivo por producto, con un encabezado y una fila por indicador, nivel, territorio y año.

| Campo | Qué lleva |
|---|---|
| `orden` | Posición del producto en el sitio (1 = primero) |
| `producto` | `id` del producto en `catalogo/publicaciones.csv` |
| `titulo` | Nombre corto para la interfaz; `titulo_catalogo` es el título del catálogo |
| `operacion`, `operacion_nombre`, `edicion` | Operación estadística y edición, copiadas del catálogo (`edicion` es `null` si el producto no tiene) |
| `url` | Página del producto en el portal |
| `fuente`, `fecha_descarga` | Cita de la fuente y fecha en que se consultó el portal |
| `nota` | Aclaración de cómo se cuenta, para mostrar junto a las cifras |
| `nivel_minimo` | Nivel territorial más fino con dato (`municipio`, `departamento` o `pais`) |
| `anios` | Años con dato, en orden |
| `kpis` | Lista de indicadores: `id`, `nombre`, `unidad` y `tipo` (`conteo` o `porcentaje`) |
| `filas` | Una por indicador, nivel, territorio y año: `kpi`, `nivel`, `territorio`, `anio`, `valor`; los porcentajes llevan además `numerador` y `denominador` |

Reglas:

- `territorio` usa los mismos códigos que el mapa del sitio: municipio como número (`805`), departamento (`8`) y `0` para el país.
- Los tres niveles vienen calculados. Departamento y país se obtienen sumando conteos, nunca promediando porcentajes. Un registro con municipio ignorado cuenta en su departamento y en el país, pero no en un municipio.
- Los porcentajes llevan un decimal. Si el denominador es 0, la fila no se escribe.
- La lógica compartida está en `comun.py`: `filas_cifras` (de conteos a filas en los tres niveles), `escribir_cifras` (escribe el archivo y actualiza el índice) y `producto_del_catalogo`.
