"""Pruebas de validación de enlaces del catálogo."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from construir_catalogo import url_web_valida


class UrlWebTest(unittest.TestCase):
    def test_url_web(self):
        for url in ("https://www.ine.gob.gt/", "http://datos.ine.gob.gt/ruta?q=1"):
            with self.subTest(url=url):
                self.assertTrue(url_web_valida(url))

    def test_rechaza_esquemas_inseguros_y_url_malformadas(self):
        for url in ("javascript:alert(1)", "//example.com", "https://usuario:clave@example.com", "https://example.com/ mal", "https://example.com\\@evil.com", "https://example.com:99999"):
            with self.subTest(url=url):
                self.assertFalse(url_web_valida(url))


if __name__ == "__main__":
    unittest.main()
