# Datos

Carpeta de trabajo local. `datos/crudos/` guarda lo descargado del portal del INE y no se versiona: cada archivo lo regenera un script (ver [docs/decisiones/0005](../docs/decisiones/0005-datos-descargados-fuera-del-repositorio.md)).

| Archivo | Se genera con |
|---|---|
| `crudos/precios_recolectados_2023.csv` | `python modelos/ipc/preparar_insumos.py` |
| `crudos/limites-hdx/` | `python pipeline/preparar_territorio.py` |
| `crudos/poblacion/` | `python pipeline/preparar_poblacion.py` |
| `crudos/nacimientos/` | `python pipeline/preparar_nacimientos.py` (los archivos XLSX de 2023 a 2025; los años anteriores se consultan en el datastore del portal) |

`pipeline/preparar_establecimientos.py` consulta el datastore del portal y no guarda archivos aquí.
