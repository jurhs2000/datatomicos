"""Cuenta los establecimientos de educación formal por municipio y año, por sector y por área.

Uso, desde la raíz del repositorio:

    python pipeline/preparar_establecimientos.py

Fuente: INE, Estadísticas de educación, establecimientos de educación formal 2022-2025
(datos.ine.gob.gt), un recurso por año. Los cuatro tienen datastore: las filas se piden con
`datastore_search` sin elegir columnas, porque las consultas que nombran «Código» (con tilde) fallan.
No se descarga ningún archivo.

Cada fila es un código de establecimiento. Una escuela con varios niveles o jornadas puede tener
más de un código, así que lo que se cuenta son códigos.

Municipio: 2024 y 2025 traen `Mupio`. 2022 y 2023 no; ahí se usa el prefijo de `Código`
(departamento y municipio, p. ej. `08-05` → 805; el departamento de Guatemala usa `00-01` → 101),
con la tabla prefijo → `Mupio` que se arma con 2024 y 2025. Un prefijo sin equivalencia cuenta
solo en el departamento.

Indicadores (códigos del diccionario de establecimientos):
- Establecimientos registrados: número de filas.
- Del sector público: `Sector` = 1 entre el total.
- En área rural: `Área` = 2 entre el total (1 es urbana y 9 ignorado).

Escribe web/public/datos/cifras/establecimientos.json en el formato común de cifras.
"""

from datetime import date

import pandas as pd

from comun import escribir_cifras, filas_cifras, filas_datastore, producto_del_catalogo

PRODUCTO = "ckan-establecimientos-educacion-formal"

# Resource id de cada año en el portal (consulta del 26 de noviembre de 2026).
RECURSOS = {
    2022: "c3d674d7-2d56-4387-8e29-83e44e1fb187",
    2023: "a77989ca-8494-4387-97c6-09db2cedebab",
    2024: "760e25bc-fb56-4c25-bd03-3c6b137ee1fb",
    2025: "82bcee73-8570-45a0-83cb-3920b452c41f",
}
PUBLICO, RURAL = 1, 2
CONTEOS = ["registrados", "publico", "rural"]

KPIS = [
    {"id": "registrados", "nombre": "Establecimientos registrados", "unidad": "establecimientos", "tipo": "conteo",
     "columna": "registrados"},
    {"id": "sector_publico", "nombre": "Del sector público", "unidad": "%", "tipo": "porcentaje",
     "numerador": "publico", "denominador": "registrados"},
    {"id": "area_rural", "nombre": "En área rural", "unidad": "%", "tipo": "porcentaje",
     "numerador": "rural", "denominador": "registrados"},
]


def main() -> None:
    anios = {}
    for anio, recurso in RECURSOS.items():
        print(f"  {anio}: filas del datastore")
        datos = pd.DataFrame(filas_datastore(recurso))
        datos["prefijo"] = datos["Código"].str[:5]
        anios[anio] = datos

    # Tabla prefijo de Código → municipio, desde los años que traen Mupio.
    con_mupio = pd.concat([d for d in anios.values() if "Mupio" in d], ignore_index=True)
    pares = con_mupio.groupby("prefijo")["Mupio"].agg(lambda s: s.mode().iat[0]).astype(int)
    print(f"  Tabla prefijo → municipio: {len(pares)} prefijos (00-01 → {pares.get('00-01')})")

    partes = []
    for anio, datos in anios.items():
        municipio = datos["Mupio"] if "Mupio" in datos else datos["prefijo"].map(pares)
        partes.append(pd.DataFrame({
            "anio": anio,
            "departamento": pd.to_numeric(datos["Depto"], errors="coerce"),
            "municipio": pd.to_numeric(municipio, errors="coerce"),
            "registrados": 1,
            "publico": (pd.to_numeric(datos["Sector"], errors="coerce") == PUBLICO).astype(int),
            "rural": (pd.to_numeric(datos["Área"], errors="coerce") == RURAL).astype(int),
        }))
        sin = municipio.isna().sum()
        if sin:
            print(f"  {anio}: {sin} filas sin municipio (cuentan solo en su departamento)")
    conteos = pd.concat(partes, ignore_index=True)
    conteos = conteos[conteos["departamento"].between(1, 22)].fillna({"municipio": 0}).astype({"municipio": int, "departamento": int})
    conteos.loc[conteos["municipio"] // 100 != conteos["departamento"], "municipio"] = 0
    conteos = conteos.groupby(["anio", "departamento", "municipio"], as_index=False)[CONTEOS].sum()

    escribir_cifras("establecimientos", 2, {
        **producto_del_catalogo(PRODUCTO),
        "titulo": "Establecimientos educativos",
        "fuente": f"INE, Estadísticas de educación: establecimientos de educación formal {min(anios)}-{max(anios)}",
        "fecha_descarga": date.today().isoformat(),
        "nota": "Cuenta códigos de establecimiento; una escuela con varios niveles o jornadas puede tener más de uno.",
        "nivel_minimo": "municipio",
        "anios": sorted(anios),
        "kpis": [{k: v for k, v in kpi.items() if k in ("id", "nombre", "unidad", "tipo")} for kpi in KPIS],
        "filas": filas_cifras(conteos, KPIS),
    })

    for anio, fila in conteos.groupby("anio")[CONTEOS].sum().iterrows():
        print(f"  {anio}: {fila['registrados']:,} establecimientos; público {100 * fila['publico'] / fila['registrados']:.1f} %; "
              f"rural {100 * fila['rural'] / fila['registrados']:.1f} %")


if __name__ == "__main__":
    main()
