"""Valida el catálogo de publicaciones y genera los archivos que lee el sitio.

Uso, desde la raíz del repositorio:

    python pipeline/construir_catalogo.py

Lee catalogo/publicaciones.csv y catalogo/departamentos.csv, y escribe:
    web/public/datos/catalogo.json
    web/public/datos/territorio/departamentos.json
"""

import csv
import re
import sys
from datetime import date
from pathlib import Path

from comun import CATALOGO, SALIDA, escribir_json

OBLIGATORIAS = [
    "id", "titulo", "tipo_publicacion", "tema", "periodo_inicio", "periodo_fin",
    "nivel_territorial_minimo", "url_publicacion", "en_ckan",
]
OPCIONALES = [
    "direccion_ine", "periodicidad", "base_metodologica", "url_descarga", "formato", "licencia",
    "fecha_descarga", "datos", "como_se_determino", "notas",
]
VALORES = {
    "tipo_publicacion": {"encuesta", "indice", "censo", "registro_administrativo", "otro"},
    "periodicidad": {"mensual", "trimestral", "semestral", "anual", "quinquenal", "decenal", "unica", "irregular"},
    "nivel_territorial_minimo": {
        "nacional", "region", "departamento", "municipio", "lugar_poblado", "sin_determinar",
    },
    "como_se_determino": {"metadatos", "contenido", "titulo", "supuesto"},
    "en_ckan": {"si", "no"},
}
ID_VALIDO = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def leer_csv(ruta: Path) -> list[dict[str, str]]:
    with ruta.open(encoding="utf-8-sig", newline="") as archivo:
        return list(csv.DictReader(archivo))


def validar(filas: list[dict[str, str]]) -> list[str]:
    errores = []
    columnas = set(filas[0]) if filas else set()
    faltan = [c for c in OBLIGATORIAS + OPCIONALES if c not in columnas]
    if faltan:
        return [f"Faltan columnas: {', '.join(faltan)}"]

    vistos = set()
    for n, fila in enumerate(filas, start=2):  # la fila 1 es el encabezado
        donde = f"Fila {n} ({fila['id'] or 'sin id'})"
        for columna in OBLIGATORIAS:
            if not fila[columna].strip():
                errores.append(f"{donde}: «{columna}» está vacía")
        if fila["id"] in vistos:
            errores.append(f"{donde}: el id está repetido")
        vistos.add(fila["id"])
        if fila["id"] and not ID_VALIDO.match(fila["id"]):
            errores.append(f"{donde}: el id debe ir en minúsculas, con guiones y sin tildes")
        for columna, permitidos in VALORES.items():
            if fila[columna] and fila[columna] not in permitidos:
                errores.append(f"{donde}: «{columna}» = «{fila[columna]}» no es uno de {sorted(permitidos)}")
        try:
            inicio, fin = int(fila["periodo_inicio"]), int(fila["periodo_fin"])
            if inicio > fin:
                errores.append(f"{donde}: periodo_inicio es mayor que periodo_fin")
        except ValueError:
            errores.append(f"{donde}: el periodo debe ser un año (aaaa)")
        if fila["fecha_descarga"]:
            try:
                date.fromisoformat(fila["fecha_descarga"])
            except ValueError:
                errores.append(f"{donde}: fecha_descarga debe ser aaaa-mm-dd")
    return errores


def a_publicacion(fila: dict[str, str]) -> dict:
    publicacion = {c: fila[c].strip() or None for c in OBLIGATORIAS + OPCIONALES}
    publicacion["periodo_inicio"] = int(fila["periodo_inicio"])
    publicacion["periodo_fin"] = int(fila["periodo_fin"])
    publicacion["en_ckan"] = fila["en_ckan"] == "si"
    publicacion["formato"] = fila["formato"].split("|") if fila["formato"] else []
    return publicacion


def main() -> None:
    filas = leer_csv(CATALOGO / "publicaciones.csv")
    errores = validar(filas)
    if errores:
        print("El catálogo tiene errores:", *errores, sep="\n  ")
        sys.exit(1)

    escribir_json(SALIDA / "catalogo.json", {
        "generado": date.today().isoformat(),
        "publicaciones": [a_publicacion(f) for f in filas],
    })
    departamentos = [
        {"codigo": int(f["codigo"]), "nombre": f["nombre"]}
        for f in leer_csv(CATALOGO / "departamentos.csv")
    ]
    escribir_json(SALIDA / "territorio" / "departamentos.json", departamentos)
    print(f"{len(filas)} publicaciones y {len(departamentos)} departamentos escritos en {SALIDA}")


if __name__ == "__main__":
    main()
