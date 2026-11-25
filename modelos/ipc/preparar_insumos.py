"""Descarga del portal del INE los precios recolectados 2023 y los convierte a CSV.

Uso, desde la raíz del repositorio:

    python modelos/ipc/preparar_insumos.py
    python modelos/ipc/preparar_insumos.py --xlsx RUTA/2023.xlsx   # usar una copia local

Resultado: datos/crudos/precios_recolectados_2023.csv (UTF-8 con BOM, separador coma).
Ese archivo no se versiona por su tamaño; este script lo regenera.
"""

import argparse
import urllib.request
from pathlib import Path

import pandas as pd

URL_PRECIOS_2023 = (
    "https://datos.ine.gob.gt/dataset/65ef0ddc-3cdc-4e42-8c09-f2d8ab12605a"
    "/resource/c5942f26-de9e-4b08-8232-df9dcafa819d/download/2023.xlsx"
)
RAIZ = Path(__file__).resolve().parents[2]
CRUDOS = RAIZ / "datos" / "crudos"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--xlsx", type=Path, help="Copia local de 2023.xlsx; si se omite, se descarga.")
    args = parser.parse_args()

    CRUDOS.mkdir(parents=True, exist_ok=True)
    xlsx = args.xlsx or CRUDOS / "precios_recolectados_2023.xlsx"
    if not xlsx.exists():
        print(f"Descargando {URL_PRECIOS_2023}")
        urllib.request.urlretrieve(URL_PRECIOS_2023, xlsx)

    print(f"Leyendo {xlsx}")
    precios = pd.read_excel(xlsx, engine="openpyxl")
    destino = CRUDOS / "precios_recolectados_2023.csv"
    precios.to_csv(destino, index=False, encoding="utf-8-sig")
    print(f"{len(precios):,} filas escritas en {destino}")


if __name__ == "__main__":
    main()
