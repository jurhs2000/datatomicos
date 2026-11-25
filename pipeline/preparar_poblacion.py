"""Agrega las proyecciones de población del INE por departamento y municipio.

Uso, desde la raíz del repositorio:

    python pipeline/preparar_poblacion.py

Fuente: INE, Estimaciones y proyecciones de la población total por municipio,
según sexo y edad, 2015-2030 (datos.ine.gob.gt).
En el archivo, SEXO = 0 es el total de ambos sexos; se suma sobre las edades.

Escribe web/public/datos/poblacion/proyecciones.json con la población total por año
para el país, cada departamento y cada municipio.

Armonización de códigos: en este archivo, los municipios 0102 a 0117 del departamento de
Guatemala aparecen como 0123 a 0138 (un desplazamiento fijo de 21). La equivalencia se
infirió por el orden y por el tamaño de población de cada municipio, coherente con el
Censo 2018 (por ejemplo, 0129 → 0108 Mixco y 0136 → 0115 Villa Nueva). Los demás
departamentos usan la codificación oficial.
"""

from datetime import date

import pandas as pd

from comun import CRUDOS, SALIDA, descargar, escribir_json

URL = (
    "https://datos.ine.gob.gt/dataset/23bbe8f8-ec9b-49c9-bcca-de78bec4efc0/resource/"
    "56b97bc0-5624-408d-a136-3931dd05610a/download/"
    "estimaciones-y-proyecciones-de-la-poblacion-total-por-municipio-segun-sexo-y-edad.-2015-2030.xlsx"
)


def main() -> None:
    archivo = descargar(URL, CRUDOS / "poblacion" / URL.rsplit("/", 1)[1])
    datos = pd.read_excel(archivo, dtype={"DEPTO": str, "MUPIO": str})
    anios = [c for c in datos.columns if isinstance(c, int)]

    total = datos[datos["SEXO"] == 0].copy()
    if total.empty:
        raise SystemExit("No se encontraron filas con SEXO = 0 (total).")

    # Ver «Armonización de códigos» en la descripción del módulo.
    equivalencias = {f"01{c}": f"01{c - 21:02d}" for c in range(23, 39)}
    a_corregir = total["MUPIO"].isin(equivalencias)
    if a_corregir.any():
        total.loc[a_corregir, "MUPIO"] = total.loc[a_corregir, "MUPIO"].map(equivalencias)
        print(f"Códigos armonizados: {a_corregir.sum()} filas de 16 municipios de Guatemala (0123-0138 → 0102-0117)")

    def por(columna: str) -> dict[str, list[int]]:
        agrupado = total.groupby(columna)[anios].sum()
        return {str(int(codigo)): [int(v) for v in fila] for codigo, fila in agrupado.iterrows()}

    escribir_json(SALIDA / "poblacion" / "proyecciones.json", {
        "fuente": "INE, Estimaciones y proyecciones de la población total por municipio, según sexo y edad, 2015-2030",
        "url": "https://datos.ine.gob.gt/dataset/proyecciones-de-poblacion-2015-2030",
        "generado": date.today().isoformat(),
        "anios": anios,
        "pais": [int(v) for v in total[anios].sum()],
        "departamentos": por("DEPTO"),
        "municipios": por("MUPIO"),
    })
    print(f"Población {anios[0]}-{anios[-1]}: {total['MUPIO'].nunique()} municipios, "
          f"{total['DEPTO'].nunique()} departamentos; país {anios[0]}: {int(total[anios[0]].sum()):,}")


if __name__ == "__main__":
    main()
