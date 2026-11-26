"""Pruebas del formato común de cifras por territorio."""
import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from comun import filas_cifras

KPIS = [
    {"id": "total", "tipo": "conteo", "columna": "total"},
    {"id": "parte", "tipo": "porcentaje", "numerador": "parte", "denominador": "base"},
]


class FilasCifrasTest(unittest.TestCase):
    def setUp(self):
        # Dos municipios de Totonicapán y un registro con municipio ignorado (0).
        conteos = pd.DataFrame([
            {"anio": 2022, "departamento": 8, "municipio": 801, "total": 10, "parte": 1, "base": 10},
            {"anio": 2022, "departamento": 8, "municipio": 805, "total": 90, "parte": 45, "base": 90},
            {"anio": 2022, "departamento": 8, "municipio": 0, "total": 5, "parte": 0, "base": 0},
        ])
        self.filas = filas_cifras(conteos, KPIS)

    def fila(self, kpi, nivel, territorio):
        return next(f for f in self.filas if (f["kpi"], f["nivel"], f["territorio"]) == (kpi, nivel, territorio))

    def test_departamento_y_pais_suman_conteos(self):
        self.assertEqual(self.fila("total", "departamento", 8)["valor"], 105)
        self.assertEqual(self.fila("total", "pais", 0)["valor"], 105)

    def test_porcentaje_agregado_no_promedia(self):
        # 46 / 100, no el promedio de 10 % y 50 %.
        fila = self.fila("parte", "departamento", 8)
        self.assertEqual((fila["valor"], fila["numerador"], fila["denominador"]), (46.0, 46, 100))

    def test_municipio_ignorado_no_tiene_fila(self):
        self.assertEqual({f["territorio"] for f in self.filas if f["nivel"] == "municipio"}, {801, 805})


if __name__ == "__main__":
    unittest.main()
