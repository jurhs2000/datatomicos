"""Exporta lo que necesita la Calculadora del IPC del sitio para proyectar en el navegador.

Uso, desde la raíz del repositorio:

    python modelos/ipc/exportar_pronostico.py

Reajusta el mismo modelo que usa el panel de pronóstico del notebook
(SARIMAX(1,1,1)(0,0,2)[12] con deriva y El Niño, sobre log(IPC) y los últimos 180 meses)
y escribe web/public/datos/ipc/pronostico.json con:

- la media del pronóstico en logaritmos sin El Niño, mes a mes, hasta 24 meses;
- su desviación estándar por horizonte;
- el coeficiente de El Niño.

No se exporta un error estándar del coeficiente: la matriz var_coef que devuelve StatsForecast
repite el mismo valor para varios coeficientes y no es confiable para eso.

En una regresión con errores ARIMA, El Niño solo suma β·x al logaritmo del mes en que ocurre
y no cambia la varianza. Con esos datos, el sitio calcula cualquier escenario exactamente igual
que el panel del notebook. Al final, el script lo comprueba para dos escenarios.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import norm
from statsforecast.models import ARIMA

RAIZ = Path(__file__).resolve().parents[2]
INSUMOS = RAIZ / "modelos" / "ipc" / "insumos"
SALIDA = RAIZ / "web" / "public" / "datos" / "ipc"

HORIZONTE_MAXIMO = 24
MESES_HISTORIAL = 180
NIVELES = (80, 95)
MESES = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()


def leer_datos() -> pd.DataFrame:
    """Lee el insumo igual que el notebook (celda de lectura)."""
    datos = pd.read_csv(INSUMOS / "ipc_mensual_variables_exogenas.csv", encoding="utf-8-sig")
    datos = datos.rename(columns={"Año": "anio", "Mes": "mes", "v": "ipc", "El Niño": "nino"})
    numero_mes = {m: i for i, m in enumerate(MESES, 1)}
    datos["fecha"] = pd.to_datetime({
        "year": datos["anio"],
        "month": datos["mes"].str.strip().str.lower().map(numero_mes),
        "day": 1,
    })
    return datos.set_index("fecha").sort_index()


def ajustar(historial: pd.DataFrame) -> ARIMA:
    """El mismo modelo y los mismos datos que el panel de pronóstico del notebook."""
    return ARIMA(
        order=(1, 1, 1),
        seasonal_order=(0, 0, 2),
        season_length=12,
        include_mean=False,
        include_drift=True,
    ).fit(np.log(historial["ipc"].to_numpy(dtype=float)), X=historial[["nino"]].to_numpy(dtype=float))


def predecir_como_el_notebook(modelo: ARIMA, x: np.ndarray, horizonte: int) -> dict[str, np.ndarray]:
    """Copia de la función predecir() del notebook, para comparar."""
    pred = {k: np.asarray(v, dtype=float) for k, v in modelo.predict(h=horizonte, X=x, level=list(NIVELES)).items()}
    varianza = ((pred["hi-95"] - pred["lo-95"]) / (2 * norm.ppf(0.975))) ** 2
    return {
        "pronostico": np.exp(pred["mean"]) * (1 + varianza / 2),
        **{
            f"{extremo}_{nivel}": np.exp(pred[f"{clave}-{nivel}"])
            for nivel in NIVELES
            for extremo, clave in [("inferior", "lo"), ("superior", "hi")]
        },
    }


def reconstruir(log_base: np.ndarray, sigma: np.ndarray, beta: float, nino: np.ndarray) -> dict[str, np.ndarray]:
    """El cálculo que hace el sitio, escrito en Python para comprobarlo."""
    media = log_base + beta * nino
    resultado = {"pronostico": np.exp(media) * (1 + sigma**2 / 2)}
    for nivel in NIVELES:
        z = norm.ppf(0.5 + nivel / 200)
        resultado[f"inferior_{nivel}"] = np.exp(media - z * sigma)
        resultado[f"superior_{nivel}"] = np.exp(media + z * sigma)
    return resultado


def main() -> None:
    datos = leer_datos()
    historial = datos.tail(MESES_HISTORIAL)
    modelo = ajustar(historial)

    beta = float(modelo.model_["coef"]["ex_1"])

    # Pronóstico base: sin El Niño en ningún mes.
    base = modelo.predict(h=HORIZONTE_MAXIMO, X=np.zeros((HORIZONTE_MAXIMO, 1)), level=[95])
    log_base = np.asarray(base["mean"], dtype=float)
    sigma = (np.asarray(base["hi-95"], dtype=float) - np.asarray(base["lo-95"], dtype=float)) / (2 * norm.ppf(0.975))

    fechas = pd.date_range(historial.index[-1] + pd.offsets.MonthBegin(1), periods=HORIZONTE_MAXIMO, freq="MS")

    # Comprobación: dos escenarios del panel, calculados por el modelo y por la reconstrucción.
    for nombre, meses_nino in [("sin El Niño", []), ("El Niño en los meses 1, 2 y 3", [1, 2, 3])]:
        horizonte = 12
        x = np.isin(np.arange(1, horizonte + 1), meses_nino).astype(float).reshape(-1, 1)
        esperado = predecir_como_el_notebook(modelo, x, horizonte)
        calculado = reconstruir(log_base[:horizonte], sigma[:horizonte], beta, x[:, 0])
        diferencia = max(float(np.max(np.abs(esperado[k] - calculado[k]))) for k in esperado)
        print(f"Escenario {nombre}: diferencia máxima {diferencia:.2e} puntos del índice")
        if diferencia > 1e-6:
            raise SystemExit("La reconstrucción no coincide con el modelo; no se escribe el archivo.")

    SALIDA.mkdir(parents=True, exist_ok=True)
    contenido = {
        "modelo": "SARIMAX(1,1,1)(0,0,2)[12] con deriva y El Niño como variable externa",
        "escala": "log(IPC)",
        "historial": {"inicio": historial.index[0].strftime("%Y-%m-%d"), "fin": historial.index[-1].strftime("%Y-%m-%d")},
        "el_nino": {
            "coeficiente": round(beta, 8),
            "efecto_porcentual": round(100 * float(np.expm1(beta)), 4),
        },
        "z": {str(n): round(float(norm.ppf(0.5 + n / 200)), 10) for n in NIVELES},
        "meses": [
            {"fecha": f.strftime("%Y-%m-%d"), "log_base": round(float(m), 10), "sigma": round(float(s), 10)}
            for f, m, s in zip(fechas, log_base, sigma)
        ],
    }
    destino = SALIDA / "pronostico.json"
    destino.write_text(json.dumps(contenido, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Efecto de El Niño: {contenido['el_nino']['efecto_porcentual']:+.4f} % (β = {beta:.6f})")
    print(f"Escrito {destino}")


if __name__ == "__main__":
    main()
