# SARIMAX del IPC y estimaciones departamentales de Guatemala

Proyecto en Python para pronosticar el Índice de Precios al Consumidor (IPC) nacional y obtener estimaciones departamentales mediante coeficientes de precios relativos.

## Problema que resuelve y usuarios

El proyecto busca anticipar la evolución de los precios al consumidor e incorporar información coyuntural al pronóstico. Como complemento, aprovecha los registros de precios del INE para ajustar el nivel del pronóstico nacional a las diferencias de precios entre departamentos.

Está dirigido a estudiantes, investigadores, analistas económicos y equipos de planificación que necesiten explorar escenarios de precios en Guatemala.

## Arquitectura general y tecnologías

La solución funciona en un notebook de Jupyter y tiene tres componentes:

1. **Modelado nacional:** prepara la serie mensual, compara las 16 combinaciones de cuatro variables exógenas candidatas y evalúa los pronósticos. `AutoARIMA` selecciona los órdenes por AICc; las combinaciones de exógenas se comparan por RMSE de validación.
2. **Coeficientes departamentales:** estima diferencias de logaritmos de precios entre departamentos, controlando por artículo, cantidad, año y mes. Conserva las comparaciones compartidas entre departamentos conectados y normaliza los factores para que su promedio sea 1. No utiliza ponderadores oficiales de gasto de los hogares.
3. **Panel de pronóstico:** permite escoger el horizonte y los períodos futuros con El Niño. Genera un gráfico nacional y tablas nacionales y departamentales.

| Tecnología | Uso |
| --- | --- |
| Python, JupyterLab e IPython | Ejecución del notebook y presentación de resultados |
| pandas, NumPy y openpyxl | Lectura de Excel y preparación de datos |
| StatsForecast | Ajuste de AutoARIMA y ARIMA con regresores externos |
| SciPy | Operaciones estadísticas, matrices dispersas y conectividad entre departamentos |
| statsmodels | ACF y prueba de Ljung–Box |
| Matplotlib e ipywidgets | Gráficos y panel interactivo |

### Modelo utilizado

El notebook conserva el modelo inicial y una especificación mejorada:

| Configuración | Inicial | Utilizada para pronosticar |
| --- | --- | --- |
| Modelo | SARIMAX(4,2,1)(0,0,0)[12] | SARIMAX(1,1,1)(0,0,2)[12] |
| Exógena seleccionada | El Niño | El Niño |
| Entrenamiento | Historia completa disponible antes de prueba | Últimos 180 meses |
| Deriva | No incluida | Incluida |

El ajuste utiliza el logaritmo del IPC. Los pronósticos se devuelven a su escala original con ajuste aproximado de sesgo e intervalos nominales del 80 % y 95 %.

La partición inicial utiliza 500 meses de ajuste interno, 12 de validación y 12 de prueba. En la evaluación del modelo mejorado, sus 180 meses de entrenamiento excluyen la prueba. Para pronosticar meses futuros, el panel lo reajusta con los últimos 180 meses de toda la información disponible.

### Efecto estimado de El Niño en el IPC

**Efecto de El Niño en el IPC: (+0.1537 %).**

En este ajuste, pasar de ausencia a presencia de El Niño se asocia con un nivel del IPC aproximadamente **0.154 % mayor**, manteniendo lo demás constante. El porcentaje corresponde al nivel del índice, no a puntos porcentuales adicionales de inflación mensual ni a un efecto causal demostrado. Este valor se actualiza al reestimar el modelo.

## Conjuntos de datos utilizados

| Datos | Fuente | Función |
| --- | --- | --- |
| IPC mensual nacional, base anual 2024 = 100 | INE, Empalme del IPC por República | Variable dependiente e índice temporal |
| Población nacional, 1950–2050 | INE, estimaciones y proyecciones | Exógena candidata, expresada en millones |
| Episodios de El Niño y La Niña | NOAA–CPC, ONI–ERSSTv6 | Indicadores binarios de fase ENOS |
| Cambios gubernamentales | Elaboración propia con fechas de toma de posesión presidencial | Exógena candidata |
| Precios recolectados 2023 | INE | Estimación de coeficientes departamentales |

Las variables candidatas son población, El Niño, La Niña y cambio gubernamental. El modelo final conserva únicamente El Niño.

### Archivos de entrada

| Archivo | Columnas que espera el código |
| --- | --- |
| `ipc_emprepu_es25.xlsx` | `Año`, `Mes`, `Índice año   Base  2024=100.00 d/`, `cambio_gobierno`, `El Niño`, `La niña`, `Poblacion` |
| `2023.xlsx` | `Año`, `Mes`, `Cod_Depto.`, `Nombre_depto.`, `Cod_artículo`, `Cantidad`, `Precio` |

En el primer archivo, la columna `Índice año   Base  2024=100.00 d/` corresponde al IPC nacional (anteriormente identificada como `v`). Antes de ejecutar el notebook, se deben agregar al Excel las columnas de las variables exógenas (`cambio_gobierno`, `El Niño`, `La niña` y `Poblacion`), alineadas por año y mes, utilizando las fuentes indicadas en la tabla anterior y en los enlaces de consulta. Si el código todavía hace referencia a `v`, debe actualizarse para utilizar el encabezado real o renombrar explícitamente la columna durante la carga.

Para construir los indicadores de El Niño y La Niña se utiliza el índice ONI de NOAA–CPC con umbrales de **+0.5 °C** para El Niño y **−0.5 °C** para La Niña, respectivamente. La clasificación de episodios requiere que el umbral se mantenga durante **al menos cinco temporadas trimestrales móviles consecutivas**. Los indicadores se codifican como 1 cuando corresponde la fase y 0 en caso contrario, asignándolos a los meses según la clasificación temporal utilizada.

La versión documentada trabaja con 524 observaciones mensuales, de marzo de 1983 a octubre de 2026. Se requieren meses consecutivos e IPC positivo. Las exógenas deben estar integradas previamente; el notebook no descarga ni construye automáticamente sus series históricas.

Fuentes de consulta:

- [INE: IPC](https://www.ine.gob.gt/indice-de-precios-al-consumidor/).
- [INE: proyecciones de población](https://www.ine.gob.gt/proyecciones/).
- [INE: precios recolectados](https://datos.ine.gob.gt/es/dataset/precios-recolectados-indice-de-precios-al-consumidor).
- [NOAA–CPC: clasificación histórica ONI–ERSSTv6](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/).
- [INSIVUMEH: perspectivas climáticas mensuales y estacionales](https://insivumeh.gob.gt/2026-2/).

## Instalación y uso

### 1. Preparar el entorno

Se necesita Python 3. En macOS o Linux, ejecutar desde la carpeta del proyecto:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install pandas numpy openpyxl matplotlib scipy statsmodels statsforecast ipywidgets jupyterlab
python3 -m jupyterlab
```

### 2. Preparar el notebook y los archivos

1. Abrir el notebook original `.ipynb`. El archivo `SARIMAX y coeficientes departamentales (1).html` es una exportación de consulta: por sí solo no ejecuta nuevos pronósticos. Si solo se dispone del HTML, es necesario recuperar el notebook o copiar sus celdas a uno nuevo.
2. Colocar ambos Excel en la carpeta de trabajo.
3. En la celda de coeficientes, sustituir la ruta absoluta de precios por `pd.read_excel("2023.xlsx", engine="openpyxl")`.
4. Añadir `import ipywidgets as widgets` a las importaciones. El código del panel usa ese nombre, pero la importación no aparece en la versión adjunta.
5. Ejecutar las celdas en orden, desde las importaciones hasta el panel. La comparación inicial de modelos puede tardar.

### 3. Generar un pronóstico

- **Meses:** elegir entre 1 y 24 períodos, según el límite definido en el código del panel.
- **El Niño:** escribir los períodos futuros separados por comas, por ejemplo `1,2,3`. El período 1 es el mes siguiente al último dato observado. El campo vacío asigna `nino = 0` a todos los meses futuros.
- Presionar **Pronosticar**. El usuario no necesita editar el código para cambiar el escenario.

Ejemplo: con datos hasta octubre de 2026, un horizonte de 6 meses y `1,2,3` genera un pronóstico de noviembre de 2026 a abril de 2027, con El Niño en noviembre, diciembre y enero.

El panel muestra el pronóstico nacional, su intervalo nominal del 95 % y dos tablas. Las tablas incluyen los límites del 80 % y 95 %. La tabla departamental aplica los coeficientes al pronóstico y a sus límites; excluye departamentos sin coeficiente estimable. Para incorporar nuevos datos históricos, es necesario actualizar los archivos y volver a ejecutar las celdas.

## Limitaciones y posibles mejoras

| Limitación actual | Posible mejora |
| --- | --- |
| La incorporación de El Niño como variable exógena permite mejorar la capacidad predictiva del modelo al considerar las condiciones climáticas. No obstante, este beneficio implica comprometer el horizonte de pronóstico, debido a la disponibilidad limitada de perspectivas climáticas de INSIVUMEH. Por ello, se prioriza la incorporación de información climática relevante frente a la generación de proyecciones a más largo plazo. | Utilizar las perspectivas de INSIVUMEH para definir y actualizar los escenarios de El Niño. Para horizontes superiores a los disponibles, comparar varios escenarios y actualizar el pronóstico conforme se publique nueva información. |
| Los coeficientes de 2023 son constantes. Cambian el nivel departamental, pero todos los departamentos conservan la variación porcentual nacional. El resultado no es un IPC departamental oficial ni el costo monetario de una canasta. | Actualizar los coeficientes y evaluar modelos territoriales con series y ponderaciones apropiadas. |
