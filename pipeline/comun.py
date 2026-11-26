"""Rutas y utilidades compartidas por los scripts del pipeline."""

import csv
import json
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
CATALOGO = RAIZ / "catalogo"
CRUDOS = RAIZ / "datos" / "crudos"
SALIDA = RAIZ / "web" / "public" / "datos"


def descargar(url: str, destino: Path) -> Path:
    """Descarga `url` en `destino` si todavía no existe y devuelve la ruta."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    if not destino.exists():
        print(f"Descargando {url}")
        urllib.request.urlretrieve(url, destino)
    return destino


def escribir_json(ruta: Path, contenido) -> None:
    """Escribe JSON en UTF-8, compacto si es grande (geometrías) y legible si es pequeño."""
    ruta.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(contenido, ensure_ascii=False, indent=1)
    if len(texto) > 200_000:
        texto = json.dumps(contenido, ensure_ascii=False, separators=(",", ":"))
    ruta.write_text(texto + "\n", encoding="utf-8")


# --- API CKAN del portal de datos abiertos del INE ---

API = "https://datos.ine.gob.gt/api/3/action/"


def _api(accion: str, parametros: dict) -> dict:
    url = API + accion + "?" + urllib.parse.urlencode(parametros)
    with urllib.request.urlopen(url, timeout=300) as respuesta:
        cuerpo = json.load(respuesta)
    if not cuerpo.get("success"):
        raise RuntimeError(f"La API respondió con error en {accion}: {cuerpo.get('error')}")
    return cuerpo["result"]


def consultar_sql(sql: str) -> list[dict]:
    """Ejecuta una consulta en el datastore del portal (`datastore_search_sql`) y devuelve las filas.

    Sirve para contar en el servidor sin descargar los archivos. Las columnas con tilde
    (por ejemplo «Código») hacen fallar la consulta; para esas, usar `filas_datastore`.
    """
    return _api("datastore_search_sql", {"sql": sql})["records"]


def filas_datastore(recurso: str, lote: int = 32_000) -> list[dict]:
    """Devuelve todas las filas de un recurso del datastore, por lotes, con todas sus columnas."""
    filas: list[dict] = []
    while True:
        resultado = _api("datastore_search", {"resource_id": recurso, "limit": lote, "offset": len(filas)})
        filas.extend(resultado["records"])
        if not resultado["records"] or len(filas) >= resultado["total"]:
            return filas


# --- Cifras por territorio y año (formato común: ver «Cifras por territorio» en pipeline/README.md) ---

NIVELES = ("municipio", "departamento", "pais")


def producto_del_catalogo(id_producto: str) -> dict:
    """Título, operación, edición y enlace del producto, tal como están en el catálogo."""
    with open(CATALOGO / "publicaciones.csv", encoding="utf-8") as archivo:
        fila = next((f for f in csv.DictReader(archivo) if f["id"] == id_producto), None)
    if fila is None:
        raise SystemExit(f"El producto {id_producto} no está en catalogo/publicaciones.csv")
    with open(CATALOGO / "operaciones.csv", encoding="utf-8") as archivo:
        operacion = next(f for f in csv.DictReader(archivo) if f["id"] == fila["operacion"])
    return {
        "producto": fila["id"],
        "titulo_catalogo": fila["titulo"],
        "operacion": fila["operacion"],
        "operacion_nombre": operacion["nombre"],
        "edicion": fila["edicion"] or None,
        "url": fila["url_publicacion"],
    }


def municipios_validos() -> set[int]:
    """Códigos de municipio del mapa del sitio (sin los lagos), para descartar códigos ignorados."""
    mapa = json.loads((SALIDA / "territorio" / "municipios.geojson").read_text(encoding="utf-8"))
    return {f["properties"]["codigo"] for f in mapa["features"] if f["properties"]["codigo"] % 100 != 0}


def filas_cifras(conteos, kpis: list[dict]) -> list[dict]:
    """Convierte conteos por año, departamento y municipio en filas de cifras para los tres niveles.

    `conteos` es un DataFrame con las columnas `anio`, `departamento`, `municipio` (0 si no se
    conoce) y una columna por cada conteo que usan los KPI. Departamento y país se calculan
    sumando conteos, nunca promediando porcentajes. Cada KPI es:
      - {"id", "tipo": "conteo", "columna"}: el valor es la suma de `columna`.
      - {"id", "tipo": "porcentaje", "numerador", "denominador"}: valor = numerador / denominador × 100,
        con un decimal; la fila guarda también numerador y denominador.
    """
    validos = municipios_validos()
    columnas = sorted({k[c] for k in kpis for c in ("columna", "numerador", "denominador") if c in k})
    desconocidos = conteos.loc[(conteos["municipio"] != 0) & ~conteos["municipio"].isin(validos), "municipio"].unique()
    if len(desconocidos):
        print(f"  Municipios fuera del mapa (cuentan solo en su departamento): {sorted(int(m) for m in desconocidos)}")
    niveles = {
        "municipio": conteos[conteos["municipio"].isin(validos)].groupby(["anio", "municipio"])[columnas].sum(),
        "departamento": conteos.groupby(["anio", "departamento"])[columnas].sum(),
        "pais": conteos.assign(pais=0).groupby(["anio", "pais"])[columnas].sum(),
    }
    filas = []
    for nivel in NIVELES:
        for (anio, territorio), suma in niveles[nivel].iterrows():
            for kpi in kpis:
                fila = {"kpi": kpi["id"], "nivel": nivel, "territorio": int(territorio), "anio": int(anio)}
                if kpi["tipo"] == "conteo":
                    fila["valor"] = int(suma[kpi["columna"]])
                else:
                    numerador, denominador = int(suma[kpi["numerador"]]), int(suma[kpi["denominador"]])
                    if denominador == 0:
                        continue
                    fila.update(valor=round(100 * numerador / denominador, 1), numerador=numerador, denominador=denominador)
                filas.append(fila)
    return filas


def escribir_cifras(nombre: str, orden: int, contenido: dict) -> None:
    """Escribe `cifras/<nombre>.json` y regenera `cifras/indice.json`.

    El índice lista todos los archivos de cifras de la carpeta, ordenados por su campo `orden`
    (el orden en que el sitio los muestra), sin importar qué script corrió primero.
    """
    carpeta = SALIDA / "cifras"
    escribir_json(carpeta / f"{nombre}.json", {"orden": orden, **contenido})
    ordenes = {
        ruta.stem: json.loads(ruta.read_text(encoding="utf-8"))["orden"]
        for ruta in carpeta.glob("*.json") if ruta.stem != "indice"
    }
    escribir_json(carpeta / "indice.json", sorted(ordenes, key=lambda n: (ordenes[n], n)))
