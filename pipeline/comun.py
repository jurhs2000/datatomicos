"""Rutas y utilidades compartidas por los scripts del pipeline."""

import json
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
