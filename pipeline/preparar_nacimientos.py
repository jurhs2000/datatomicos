"""Cuenta los nacimientos registrados por municipio y año, con dos indicadores de atención y edad.

Uso, desde la raíz del repositorio:

    python pipeline/preparar_nacimientos.py

Fuente: INE, Estadísticas vitales, nacimientos 2018-2025 (datos.ine.gob.gt), un recurso por año.

- 2018 a 2022 tienen datastore: se cuenta en el servidor del portal con `datastore_search_sql`,
  sin descargar los archivos.
- 2023 a 2025 solo están en XLSX (39 a 59 MB): se descargan a `datos/crudos/nacimientos/`
  (no se versiona) y se cuentan localmente.

Territorio: residencia de la madre (`Deprem`, `Muprem`); solo cuentan los registros con
departamento de residencia en Guatemala (1 a 22). Si el municipio es ignorado o no corresponde
al departamento, el registro cuenta en el departamento y en el país, pero no en un municipio.
Los registros con residencia de la madre ignorada (`Deprem` 99) o en el extranjero (23) no se
cuentan, así que el país es la suma de los 22 departamentos y queda por debajo del total de
registros del archivo. Desde 2023 los ignorados son más frecuentes (alrededor de 4 % en 2025).
Año: el del archivo (año de registro).

Indicadores (códigos del diccionario de nacimientos 2018-2022):
- Nacimientos registrados: número de registros.
- Partos atendidos por comadrona: `Asisrec` = 4 entre los registros con `Asisrec` distinto de 9 (ignorado).
- Madres menores de 20 años: `Edadm` < 20 entre los registros con `Edadm` distinto de 999 (ignorado).

Escribe web/public/datos/cifras/nacimientos.json en el formato común de cifras.
"""

from datetime import date

import pandas as pd

from comun import CRUDOS, consultar_sql, descargar, escribir_cifras, filas_cifras, producto_del_catalogo

PRODUCTO = "ckan-estadisticas-vitales-nacimientos"
DATASET = "https://datos.ine.gob.gt/dataset/96888fc0-5ced-4a58-bfd0-2a6a292e3208/resource/"

# Resource id de cada año en el portal (consulta del 26 de noviembre de 2026).
DATASTORE = {
    2018: "41b95ebc-35c6-43d3-86db-4b85998cda04",
    2019: "c32be289-eceb-4264-a570-1cecef37635c",
    2020: "146d86fb-3736-4536-a3fa-09a047b7e601",
    2021: "25bfa38b-0d32-4b4f-aed9-6ae57eae38ed",
    2022: "a7d24194-227e-4cbe-9fd8-d7ddb92eb2b3",
}
ARCHIVOS = {
    2023: "ecfb6233-d695-46ee-be95-386d25aebb14/download/bdnacimientos2023.xlsx",
    2024: "14f54638-cf4a-4476-9a45-e03ab2baa3c3/download/nacimientos2024_da.xlsx",
    2025: "b6847c70-a0b9-4cfd-a405-4ea4360905d7/download/nacimientos_2025.xlsx",
}

COMADRONA, ASISTENCIA_IGNORADA, EDAD_IGNORADA = 4, 9, 999
CONTEOS = ["registrados", "comadrona", "con_asistencia", "menores_20", "con_edad"]

KPIS = [
    {"id": "registrados", "nombre": "Nacimientos registrados", "unidad": "nacimientos", "tipo": "conteo",
     "columna": "registrados"},
    {"id": "comadrona", "nombre": "Partos atendidos por comadrona", "unidad": "%", "tipo": "porcentaje",
     "numerador": "comadrona", "denominador": "con_asistencia"},
    {"id": "madres_menores_20", "nombre": "Madres menores de 20 años", "unidad": "%", "tipo": "porcentaje",
     "numerador": "menores_20", "denominador": "con_edad"},
]


def contar_en_servidor(anio: int, recurso: str) -> pd.DataFrame:
    sql = f'''
        SELECT "Deprem" AS departamento, "Muprem" AS municipio,
               count(*) AS registrados,
               sum(CASE WHEN "Asisrec" = {COMADRONA} THEN 1 ELSE 0 END) AS comadrona,
               sum(CASE WHEN "Asisrec" <> {ASISTENCIA_IGNORADA} THEN 1 ELSE 0 END) AS con_asistencia,
               sum(CASE WHEN "Edadm" < 20 THEN 1 ELSE 0 END) AS menores_20,
               sum(CASE WHEN "Edadm" <> {EDAD_IGNORADA} THEN 1 ELSE 0 END) AS con_edad
        FROM "{recurso}"
        WHERE "Deprem" BETWEEN 1 AND 22
        GROUP BY "Deprem", "Muprem"'''
    print(f"  {anio}: conteo en el servidor (datastore_search_sql)")
    return pd.DataFrame(consultar_sql(sql)).assign(anio=anio)


def contar_archivo(anio: int, ruta: str) -> pd.DataFrame:
    archivo = descargar(DATASET + ruta, CRUDOS / "nacimientos" / ruta.rsplit("/", 1)[1])
    print(f"  {anio}: conteo local de {archivo.name}")
    # Los nombres de columna cambian de mayúsculas entre años; el municipio puede venir como texto ('0101').
    buscadas = {"deprem", "muprem", "asisrec", "edadm"}
    datos = pd.read_excel(archivo, usecols=lambda c: str(c).strip().lower() in buscadas)
    datos.columns = [str(c).strip().lower() for c in datos.columns]
    datos = datos.apply(pd.to_numeric, errors="coerce")
    datos = datos[datos["deprem"].between(1, 22)]
    conteos = pd.DataFrame({
        "departamento": datos["deprem"],
        "municipio": datos["muprem"],
        "registrados": 1,
        "comadrona": (datos["asisrec"] == COMADRONA).astype(int),
        "con_asistencia": (datos["asisrec"].notna() & (datos["asisrec"] != ASISTENCIA_IGNORADA)).astype(int),
        "menores_20": (datos["edadm"] < 20).astype(int),
        "con_edad": (datos["edadm"].notna() & (datos["edadm"] != EDAD_IGNORADA)).astype(int),
    })
    return conteos.groupby(["departamento", "municipio"], dropna=False, as_index=False).sum().assign(anio=anio)


def main() -> None:
    partes = [contar_en_servidor(a, r) for a, r in DATASTORE.items()]
    partes += [contar_archivo(a, r) for a, r in ARCHIVOS.items()]
    conteos = pd.concat(partes, ignore_index=True)
    for columna in ["departamento", "municipio", *CONTEOS]:
        conteos[columna] = pd.to_numeric(conteos[columna], errors="coerce").fillna(0).astype(int)
    # Municipio ignorado o de otro departamento: cuenta solo en el departamento.
    conteos.loc[conteos["municipio"] // 100 != conteos["departamento"], "municipio"] = 0

    anios = sorted(conteos["anio"].unique().tolist())
    escribir_cifras("nacimientos", 1, {
        **producto_del_catalogo(PRODUCTO),
        "titulo": "Nacimientos",
        "fuente": f"INE, Estadísticas vitales: nacimientos {anios[0]}-{anios[-1]}",
        "fecha_descarga": date.today().isoformat(),
        "nota": "Por residencia de la madre y año de registro. No incluye los registros con residencia de la madre ignorada o en el extranjero.",
        "nivel_minimo": "municipio",
        "anios": anios,
        "kpis": [{k: v for k, v in kpi.items() if k in ("id", "nombre", "unidad", "tipo")} for kpi in KPIS],
        "filas": filas_cifras(conteos, KPIS),
    })

    pais = conteos.groupby("anio")[CONTEOS].sum()
    for anio, fila in pais.iterrows():
        print(f"  {anio}: {fila['registrados']:,} nacimientos; comadrona {100 * fila['comadrona'] / fila['con_asistencia']:.1f} %; "
              f"menores de 20 {100 * fila['menores_20'] / fila['con_edad']:.1f} %")


if __name__ == "__main__":
    main()
