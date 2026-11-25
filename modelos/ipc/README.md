# Proyección del IPC y coeficientes departamentales

Análisis estadístico que alimenta la sección del IPC. El notebook `sarimax_coeficientes_departamentales.ipynb` tiene dos partes:

1. **Proyección del IPC nacional** con un modelo SARIMAX, evaluada fuera de muestra sobre noviembre 2025 a octubre 2026.
2. **Coeficientes de nivel de precios relativo por departamento**, estimados con los precios recolectados para el IPC en 2023.

Los resultados son estimaciones del equipo y no cifras oficiales del INE.

> **Estado:** versión de trabajo. El modelo y sus resultados pueden cambiar al documentar las fuentes de las variables externas.

## Insumos

| Archivo | Contenido | Origen | En el repositorio |
|---|---|---|---|
| `insumos/ipc_mensual_variables_exogenas.csv` | IPC mensual de la República (marzo 1983 a octubre 2026) y variables externas: cambio de gobierno, El Niño, La Niña y población | Columna `v`: [Empalme del IPC por República, Base Anual 2024 = 100.00](https://datos.ine.gob.gt/dataset/ipc-por-producto-ano-2024-100-0/resource/6b2cb40a-188c-47c9-9288-ba11c40b5910), descargado el 2026-11-23. Variables externas: *fuentes pendientes de documentar* | Sí (24 KB) |
| `datos/crudos/precios_recolectados_2023.csv` | Precios recolectados para el IPC en 2023, por artículo, departamento y municipio (466,271 filas) | [Precios recolectados 2023](https://datos.ine.gob.gt/dataset/precios-recolectados-indice-de-precios-al-consumidor/resource/c5942f26-de9e-4b08-8232-df9dcafa819d), descargado el 2026-11-23 | No (70 MB); se genera con `preparar_insumos.py` |

## Cómo correrlo

Desde la raíz del repositorio:

```bash
python modelos/ipc/preparar_insumos.py
```

Descarga los precios recolectados 2023 del portal y los guarda como CSV en `datos/crudos/`. Si ya se tiene el archivo, `--xlsx RUTA` evita la descarga. Después se abre el notebook desde cualquier carpeta del repositorio: las rutas se resuelven a partir de la raíz.

Dependencias: numpy, pandas, scipy, statsmodels, statsforecast, matplotlib, openpyxl e ipykernel.

## Pendiente

- Documentar la fuente de cada variable externa y cómo se obtienen sus valores futuros para proyectar.
- Exportar el pronóstico, sus intervalos, las métricas y los coeficientes a archivos que consuma la interfaz.
