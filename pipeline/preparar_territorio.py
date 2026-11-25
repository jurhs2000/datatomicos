"""Prepara los límites de departamentos y municipios para el mapa del sitio.

Uso, desde la raíz del repositorio:

    python pipeline/preparar_territorio.py

Fuente: Límites administrativos de Guatemala (COD-AB), publicados por OCHA en HDX
con datos de CONRED, licencia CC BY-IGO: https://data.humdata.org/dataset/cod-ab-gtm

Los P-codes de HDX son los códigos del INE con el prefijo «GT» (GT0411 = 0411, Acatenango),
así que se convierten a número y cruzan directo con las bases del INE.

Escribe, con geometrías simplificadas:
    web/public/datos/territorio/departamentos.geojson
    web/public/datos/territorio/municipios.geojson
"""

import csv
import json

import geopandas as gpd

from comun import CATALOGO, CRUDOS, SALIDA, descargar, escribir_json

URL = (
    "https://data.humdata.org/dataset/0b20f310-7d22-479c-b7e2-e1bb9737fa72"
    "/resource/77e5e79b-d7b0-497c-aea2-2753768ec5f0/download/gtm_admin_boundaries.geojson.zip"
)
# Tolerancia de simplificación en grados (0.004 ≈ 400 m): suficiente para un mapa de país.
TOLERANCIA = {"departamentos": 0.004, "municipios": 0.002}


def leer_capa(archivo_zip, capa: str) -> gpd.GeoDataFrame:
    return gpd.read_file(f"zip://{archivo_zip.as_posix()}!{capa}")


def a_geojson(capa: gpd.GeoDataFrame, tolerancia: float) -> dict:
    capa = capa.copy()
    capa["geometry"] = capa.geometry.simplify(tolerancia, preserve_topology=True)
    geojson = json.loads(capa.to_json(drop_id=True))
    # Redondear coordenadas a 4 decimales (≈ 10 m) para reducir el tamaño.
    def redondear(c):
        return [round(c[0], 4), round(c[1], 4)] if isinstance(c[0], float) else [redondear(x) for x in c]
    for f in geojson["features"]:
        f["geometry"]["coordinates"] = redondear(f["geometry"]["coordinates"])
    return geojson


def main() -> None:
    archivo = descargar(URL, CRUDOS / "limites-hdx" / "gtm_admin_boundaries.geojson.zip")

    deptos = leer_capa(archivo, "gtm_admin1.geojson")
    deptos = deptos.assign(codigo=deptos.adm1_pcode.str[2:].astype(int), nombre=deptos.adm1_name)
    munis = leer_capa(archivo, "gtm_admin2.geojson")
    munis = munis.assign(
        codigo=munis.adm2_pcode.str[2:].astype(int),
        departamento=munis.adm1_pcode.str[2:].astype(int),
        nombre=munis.adm2_name,
    )

    # Verificar que los departamentos coinciden con los del catálogo.
    with (CATALOGO / "departamentos.csv").open(encoding="utf-8-sig") as f:
        esperados = {int(r["codigo"]) for r in csv.DictReader(f)}
    if set(deptos.codigo) != esperados:
        raise SystemExit(f"Los códigos de departamento no coinciden: {sorted(set(deptos.codigo) ^ esperados)}")

    escribir_json(
        SALIDA / "territorio" / "departamentos.geojson",
        a_geojson(deptos[["codigo", "nombre", "geometry"]], TOLERANCIA["departamentos"]),
    )
    escribir_json(
        SALIDA / "territorio" / "municipios.geojson",
        a_geojson(munis[["codigo", "departamento", "nombre", "geometry"]], TOLERANCIA["municipios"]),
    )
    print(f"{len(deptos)} departamentos y {len(munis)} municipios escritos en {SALIDA / 'territorio'}")


if __name__ == "__main__":
    main()
