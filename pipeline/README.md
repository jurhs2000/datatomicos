# Pipeline de datos

Descarga los datos, los normaliza y produce los archivos que consume el sitio en `web/public/datos/`. Se corre desde la raíz del repositorio con el entorno `series-tiempo-geo`.

| Script | Lee | Escribe |
|---|---|---|
| `construir_catalogo.py` | `catalogo/publicaciones.csv`, `catalogo/departamentos.csv` | `catalogo.json`, `territorio/departamentos.json` |
| `preparar_territorio.py` | Límites de HDX (COD-AB) | `territorio/departamentos.geojson`, `territorio/municipios.geojson` |
| `preparar_poblacion.py` | Proyecciones de población del INE 2015-2030 | `poblacion/proyecciones.json` |

`comun.py` tiene las rutas y utilidades compartidas. Lo descargado se guarda en `datos/crudos/` y no se versiona.
