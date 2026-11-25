# Datos

Carpeta de trabajo local. `datos/crudos/` guarda lo descargado del portal del INE y no se versiona: cada archivo lo regenera un script (ver [docs/decisiones/0005](../docs/decisiones/0005-datos-descargados-fuera-del-repositorio.md)).

| Archivo | Se genera con |
|---|---|
| `crudos/precios_recolectados_2023.csv` | `python modelos/ipc/preparar_insumos.py` |
