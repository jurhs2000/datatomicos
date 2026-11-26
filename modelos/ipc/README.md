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

Los enlaces, licencias y fechas de descarga de cada conjunto están en la sección «Datos utilizados» del [README principal](../../README.md#datos-utilizados).

### Archivos de entrada

| Archivo | Columnas que espera el código | En el repositorio |
| --- | --- | --- |
| `modelos/ipc/insumos/ipc_mensual_variables_exogenas.csv` | `Año`, `Mes`, `v`, `cambio_gobierno`, `El Niño`, `La niña`, `Poblacion` | Sí (24 KB) |
| `datos/crudos/precios_recolectados_2023.csv` | `Año`, `Mes`, `Cod_Depto.`, `Nombre_depto.`, `Cod_artículo`, `Cantidad`, `Precio` | No (70 MB); se genera con `preparar_insumos.py` |

En el primer archivo, la columna `v` corresponde al IPC nacional: en la publicación del INE se llama `Índice año   Base  2024=100.00 d/`. El archivo ya integra las variables exógenas (`cambio_gobierno`, `El Niño`, `La niña` y `Poblacion`), alineadas por año y mes con las fuentes indicadas en la tabla anterior.

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

El entorno del proyecto se crea desde la raíz del repositorio con `environment.yml`, que incluye todas las dependencias del notebook (ver «Instalación y uso» en el [README principal](../../README.md#instalación-y-uso)):

```bash
conda env create -f environment.yml
conda activate series-tiempo-geo
```

### 2. Preparar los archivos y ejecutar el notebook

1. Desde la raíz del repositorio, generar los precios recolectados 2023:

   ```bash
   python modelos/ipc/preparar_insumos.py
   ```

   Descarga el archivo del portal del INE y lo guarda como CSV en `datos/crudos/`. Si ya se tiene `2023.xlsx`, `--xlsx RUTA` evita la descarga.
2. Abrir `sarimax_coeficientes_departamentales.ipynb` desde cualquier carpeta del repositorio: las rutas se resuelven a partir de la raíz.
3. Ejecutar las celdas en orden, desde las importaciones hasta la exportación final. La comparación inicial de modelos puede tardar (unos 4 minutos).

### 3. Generar un pronóstico

- **Meses:** elegir entre 1 y 24 períodos, según el límite definido en el código del panel.
- **El Niño:** escribir los períodos futuros separados por comas, por ejemplo `1,2,3`. El período 1 es el mes siguiente al último dato observado. El campo vacío asigna `nino = 0` a todos los meses futuros.
- Presionar **Pronosticar**. El usuario no necesita editar el código para cambiar el escenario.

Ejemplo: con datos hasta octubre de 2026, un horizonte de 6 meses y `1,2,3` genera un pronóstico de noviembre de 2026 a abril de 2027, con El Niño en noviembre, diciembre y enero.

El panel muestra el pronóstico nacional, su intervalo nominal del 95 % y dos tablas. Las tablas incluyen los límites del 80 % y 95 %. La tabla departamental aplica los coeficientes al pronóstico y a sus límites; excluye departamentos sin coeficiente estimable. Para incorporar nuevos datos históricos, es necesario actualizar los archivos y volver a ejecutar las celdas.

### 4. Exportación para el sitio web

La última celda escribe en `web/public/datos/ipc/` los archivos que lee la sección del IPC del sitio. No cambia ningún resultado: solo guarda lo que calcularon las celdas anteriores.

| Archivo | Contenido |
| --- | --- |
| `serie.json` | IPC mensual observado |
| `validacion.json` | Modelo, periodos de entrenamiento y prueba, métricas, p-valor de Ljung–Box y pronóstico con intervalos para los 12 meses de prueba |
| `coeficientes.json` | Coeficiente y número de observaciones por departamento |

El pronóstico de meses futuros lo exporta `exportar_pronostico.py`, que no depende del notebook:

```bash
python modelos/ipc/exportar_pronostico.py
```

Reajusta el mismo modelo del panel (últimos 180 meses) y escribe `pronostico.json`: para cada uno de los próximos 24 meses, la media del pronóstico en logaritmos sin El Niño y su desviación estándar, más el coeficiente de El Niño. En una regresión con errores ARIMA, El Niño solo suma su coeficiente al logaritmo del mes en que ocurre y no cambia la varianza, así que la Calculadora del IPC del sitio recalcula cualquier escenario (horizonte, meses con El Niño y departamento) igual que el panel. El script lo comprueba con dos escenarios antes de escribir el archivo y se detiene si la diferencia supera 0.000001 puntos del índice.

## Limitaciones y posibles mejoras

| Limitación actual | Posible mejora |
| --- | --- |
| La incorporación de El Niño como variable exógena permite mejorar la capacidad predictiva del modelo al considerar las condiciones climáticas. No obstante, este beneficio implica comprometer el horizonte de pronóstico, debido a la disponibilidad limitada de perspectivas climáticas de INSIVUMEH. Por ello, se prioriza la incorporación de información climática relevante frente a la generación de proyecciones a más largo plazo. | Utilizar las perspectivas de INSIVUMEH para definir y actualizar los escenarios de El Niño. Para horizontes superiores a los disponibles, comparar varios escenarios y actualizar el pronóstico conforme se publique nueva información. |
| Los coeficientes de 2023 son constantes. Cambian el nivel departamental, pero todos los departamentos conservan la variación porcentual nacional. El resultado no es un IPC departamental oficial ni el costo monetario de una canasta. | Actualizar los coeficientes y evaluar modelos territoriales con series y ponderaciones apropiadas. |
