"""Valida el catálogo de publicaciones y genera los archivos que lee el sitio.

Uso, desde la raíz del repositorio:

    python pipeline/construir_catalogo.py

Lee de catalogo/:
    publicaciones.csv   una fila por publicación del INE
    operaciones.csv     operaciones estadísticas (el origen de cada publicación)
    ediciones.csv       ediciones de cada operación (levantamientos o bases metodológicas)
    relaciones.csv      qué operación usa insumos de cuál
    temas.csv           temas de «Estadísticas por tema» del portal del INE
    departamentos.csv   códigos y nombres de los departamentos

y escribe:
    web/public/datos/catalogo.json
    web/public/datos/territorio/departamentos.json

Si una fila no cumple el esquema o una llave no existe en su tabla, se detiene y dice cuál y por qué.
"""

import csv
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

from comun import CATALOGO, SALIDA, escribir_json

ID_VALIDO = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PERIODICIDAD = {"mensual", "trimestral", "semestral", "anual", "quinquenal", "decenal", "unica", "irregular"}


class Tabla:
    """Esquema de un CSV: columnas obligatorias, opcionales, vocabularios y columnas de varios valores (|)."""

    def __init__(self, archivo, obligatorias, opcionales=(), valores=None, listas=()):
        self.archivo = archivo
        self.obligatorias = list(obligatorias)
        self.opcionales = list(opcionales)
        self.valores = valores or {}
        self.listas = set(listas)

    @property
    def columnas(self):
        return self.obligatorias + self.opcionales


PUBLICACIONES = Tabla(
    "publicaciones.csv",
    obligatorias=["id", "titulo", "operacion", "periodo_inicio", "periodo_fin", "nivel_territorial_minimo",
                  "url_publicacion", "en_ckan"],
    opcionales=["direccion_ine", "edicion", "nivel_procesamiento", "nivel_determinado_por", "periodicidad",
                "base_metodologica", "url_descarga", "formato", "licencia", "fecha_descarga", "datos",
                "como_se_determino", "notas"],
    valores={
        "periodicidad": PERIODICIDAD,
        "nivel_territorial_minimo": {"nacional", "region", "departamento", "municipio", "lugar_poblado", "sin_determinar"},
        "nivel_procesamiento": {"microdatos", "cuadros", "indicadores", "informes"},
        "nivel_determinado_por": {"contenido", "titulo", "formato", "supuesto"},
        "como_se_determino": {"metadatos", "contenido", "titulo", "supuesto"},
        "en_ckan": {"si", "no"},
    },
    listas=["edicion", "nivel_procesamiento", "formato"],
)
TEMAS = Tabla("temas.csv", ["id", "nombre", "orden_portal", "url_portal"], ["fecha_consulta"])
OPERACIONES = Tabla(
    "operaciones.csv",
    obligatorias=["id", "nombre", "tipo_operacion", "descripcion", "descripcion_origen", "url_portal"],
    opcionales=["siglas", "url_descripcion", "direccion_ine", "departamento_ine", "institucion_fuente",
                "periodicidad", "tema_portal", "menu_portal", "url_metodologia", "fecha_consulta"],
    valores={
        "tipo_operacion": {"censo", "encuesta", "indice", "registro_administrativo", "estimacion"},
        "descripcion_origen": {"ine", "propia"},
        "periodicidad": PERIODICIDAD,
        "menu_portal": {"Estadísticas por tema", "Encuestas", "Servicios estadísticos", "Solo en datos.ine.gob.gt"},
    },
    listas=["menu_portal"],
)
EDICIONES = Tabla(
    "ediciones.csv",
    obligatorias=["id", "operacion", "nombre", "anio_inicio", "anio_fin"],
    opcionales=["base_metodologica", "url_portal", "url_metodologia", "fecha_consulta", "como_se_determino"],
    valores={"como_se_determino": {"portal", "metodologia", "catalogo"}},
)
RELACIONES = Tabla(
    "relaciones.csv",
    obligatorias=["id", "operacion", "tipo_relacion", "descripcion", "url_respaldo", "confianza"],
    opcionales=["edicion", "usa_insumo_de", "edicion_insumo", "insumo_externo", "pagina", "fecha_consulta"],
    valores={
        "tipo_relacion": {
            "ponderadores", "estructura_de_consumo", "precios", "marco_muestral", "diseno_muestral",
            "poblacion_base", "componentes_demograficos", "validacion", "deflactor", "registros", "insumo",
            "metodologia", "sucede_a",
        },
        "confianza": {"confirmado", "probable", "hipótesis"},
    },
    listas=["insumo_externo"],
)


def leer_csv(ruta: Path) -> list[dict[str, str]]:
    with ruta.open(encoding="utf-8-sig", newline="") as archivo:
        return list(csv.DictReader(archivo))


def valores_de(fila: dict[str, str], columna: str) -> list[str]:
    return [v.strip() for v in fila[columna].split("|") if v.strip()]


def url_web_valida(valor: str) -> bool:
    """Acepta solo URL web absolutas, sin espacios ni credenciales."""
    if "\\" in valor or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in valor):
        return False
    try:
        url = urlsplit(valor)
        # Acceder al puerto también detecta puertos mal formados.
        _ = url.port
        return url.scheme in {"http", "https"} and bool(url.hostname) and url.username is None and url.password is None
    except ValueError:
        return False


def validar_tabla(tabla: Tabla, filas: list[dict[str, str]]) -> list[str]:
    """Columnas, obligatorias, ids únicos y vocabularios cerrados."""
    columnas = set(filas[0]) if filas else set()
    faltan = [c for c in tabla.columnas if c not in columnas]
    if faltan:
        return [f"{tabla.archivo}: faltan columnas: {', '.join(faltan)}"]

    errores, vistos = [], set()
    for n, fila in enumerate(filas, start=2):  # la fila 1 es el encabezado
        donde = f"{tabla.archivo}, fila {n} ({fila['id'] or 'sin id'})"
        for columna in tabla.obligatorias:
            if not fila[columna].strip():
                errores.append(f"{donde}: «{columna}» está vacía")
        if fila["id"] in vistos:
            errores.append(f"{donde}: el id está repetido")
        vistos.add(fila["id"])
        if fila["id"] and not ID_VALIDO.match(fila["id"]):
            errores.append(f"{donde}: el id debe ir en minúsculas, con guiones y sin tildes")
        for columna in tabla.columnas:
            if columna.startswith("url_") and fila[columna] and not url_web_valida(fila[columna]):
                errores.append(f"{donde}: «{columna}» debe ser una URL HTTP o HTTPS válida, sin credenciales")
        for columna, permitidos in tabla.valores.items():
            for valor in valores_de(fila, columna) if columna in tabla.listas else [fila[columna]] if fila[columna] else []:
                if valor not in permitidos:
                    errores.append(f"{donde}: «{columna}» = «{valor}» no es uno de {sorted(permitidos)}")
    return errores


def validar_anios(archivo: str, filas: list[dict[str, str]], inicio: str, fin: str) -> list[str]:
    errores = []
    for n, fila in enumerate(filas, start=2):
        try:
            if int(fila[inicio]) > int(fila[fin]):
                errores.append(f"{archivo}, fila {n} ({fila['id']}): {inicio} es mayor que {fin}")
        except ValueError:
            errores.append(f"{archivo}, fila {n} ({fila['id']}): {inicio} y {fin} deben ser años (aaaa)")
    return errores


def validar_llaves(publicaciones, temas, operaciones, ediciones, relaciones) -> list[str]:
    """Que toda referencia entre tablas exista y sea coherente."""
    errores = []
    ids_temas = {t["id"] for t in temas}
    ids_operaciones = {o["id"] for o in operaciones}
    operacion_de_edicion = {e["id"]: e["operacion"] for e in ediciones}

    def existe(donde, columna, valor, ids, tabla):
        if valor and valor not in ids:
            errores.append(f"{donde}: «{columna}» = «{valor}» no existe en {tabla}")
            return False
        return bool(valor)

    def de_la_operacion(donde, columna, edicion, operacion):
        if existe(donde, columna, edicion, operacion_de_edicion, "ediciones.csv") and operacion_de_edicion[edicion] != operacion:
            errores.append(f"{donde}: la edición «{edicion}» es de «{operacion_de_edicion[edicion]}», no de «{operacion}»")

    for o in operaciones:
        existe(f"operaciones.csv ({o['id']})", "tema_portal", o["tema_portal"], ids_temas, "temas.csv")
    for e in ediciones:
        existe(f"ediciones.csv ({e['id']})", "operacion", e["operacion"], ids_operaciones, "operaciones.csv")
    for p in publicaciones:
        donde = f"publicaciones.csv ({p['id']})"
        if existe(donde, "operacion", p["operacion"], ids_operaciones, "operaciones.csv"):
            for edicion in valores_de(p, "edicion"):
                de_la_operacion(donde, "edicion", edicion, p["operacion"])
    for r in relaciones:
        donde = f"relaciones.csv ({r['id']})"
        if existe(donde, "operacion", r["operacion"], ids_operaciones, "operaciones.csv") and r["edicion"]:
            de_la_operacion(donde, "edicion", r["edicion"], r["operacion"])
        if bool(r["usa_insumo_de"]) == bool(r["insumo_externo"]):
            errores.append(f"{donde}: debe tener «usa_insumo_de» o «insumo_externo», y solo uno")
        if existe(donde, "usa_insumo_de", r["usa_insumo_de"], ids_operaciones, "operaciones.csv") and r["edicion_insumo"]:
            de_la_operacion(donde, "edicion_insumo", r["edicion_insumo"], r["usa_insumo_de"])
        if r["edicion_insumo"] and not r["usa_insumo_de"]:
            errores.append(f"{donde}: «edicion_insumo» requiere «usa_insumo_de»")
    return errores


def a_json(tabla: Tabla, fila: dict[str, str]) -> dict:
    """Vacíos a null y columnas de varios valores a listas."""
    return {
        c: valores_de(fila, c) if c in tabla.listas else (fila[c].strip() or None)
        for c in tabla.columnas
    }


def a_publicacion(fila: dict[str, str], operaciones: dict[str, dict]) -> dict:
    publicacion = a_json(PUBLICACIONES, fila)
    publicacion["ediciones"] = publicacion.pop("edicion")
    publicacion["periodo_inicio"] = int(fila["periodo_inicio"])
    publicacion["periodo_fin"] = int(fila["periodo_fin"])
    publicacion["en_ckan"] = fila["en_ckan"] == "si"
    # Derivados de la operación: un solo lugar donde se definen.
    operacion = operaciones[fila["operacion"]]
    publicacion["tipo_operacion"] = operacion["tipo_operacion"]
    publicacion["tema_portal"] = operacion["tema_portal"] or None
    return publicacion


def main() -> None:
    tablas = {t: leer_csv(CATALOGO / t.archivo) for t in (PUBLICACIONES, TEMAS, OPERACIONES, EDICIONES, RELACIONES)}
    publicaciones, temas, operaciones, ediciones, relaciones = tablas.values()

    errores = [e for tabla, filas in tablas.items() for e in validar_tabla(tabla, filas)]
    errores += validar_anios("publicaciones.csv", publicaciones, "periodo_inicio", "periodo_fin")
    errores += validar_anios("ediciones.csv", ediciones, "anio_inicio", "anio_fin")
    for n, fila in enumerate(publicaciones, start=2):
        if fila["fecha_descarga"]:
            try:
                date.fromisoformat(fila["fecha_descarga"])
            except ValueError:
                errores.append(f"publicaciones.csv, fila {n} ({fila['id']}): fecha_descarga debe ser aaaa-mm-dd")
    if not errores:  # las llaves solo se revisan sobre tablas bien formadas
        errores = validar_llaves(publicaciones, temas, operaciones, ediciones, relaciones)
    if errores:
        print("El catálogo tiene errores:", *errores, sep="\n  ")
        sys.exit(1)

    por_id = {o["id"]: o for o in operaciones}
    escribir_json(SALIDA / "catalogo.json", {
        "generado": date.today().isoformat(),
        "publicaciones": [a_publicacion(f, por_id) for f in publicaciones],
        "temas": [
            {**a_json(TEMAS, t), "orden_portal": int(t["orden_portal"])}
            for t in sorted(temas, key=lambda t: int(t["orden_portal"]))
        ],
        "operaciones": [a_json(OPERACIONES, o) for o in operaciones],
        "ediciones": [
            {**a_json(EDICIONES, e), "anio_inicio": int(e["anio_inicio"]), "anio_fin": int(e["anio_fin"])}
            for e in ediciones
        ],
        "relaciones": [a_json(RELACIONES, r) for r in relaciones],
    })
    departamentos = [
        {"codigo": int(f["codigo"]), "nombre": f["nombre"]}
        for f in leer_csv(CATALOGO / "departamentos.csv")
    ]
    escribir_json(SALIDA / "territorio" / "departamentos.json", departamentos)
    print(
        f"{len(publicaciones)} publicaciones, {len(operaciones)} operaciones, {len(ediciones)} ediciones, "
        f"{len(relaciones)} relaciones, {len(temas)} temas y {len(departamentos)} departamentos escritos en {SALIDA}"
    )


if __name__ == "__main__":
    main()
