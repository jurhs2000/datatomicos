# Atlas INE

**Guatemala en datos.** Propuesta del equipo Datatómicos para el **Datatón INE 2026**, categoría Tecnológica y ciencias de datos.

**Sitio:** [jurhs2000.github.io/datatomicos](https://jurhs2000.github.io/datatomicos/)

Elige un lugar de Guatemala y un periodo, y Atlas INE reúne lo que el INE ha medido ahí: las cifras, de dónde sale cada una y hacia dónde van.

El Instituto Nacional de Estadística (INE) publica censos, encuestas, índices de precios y registros administrativos, y casi todos describen un lugar y un periodo. Atlas INE organiza 146 productos del INE, de 41 operaciones estadísticas, para que se puedan consultar **por dónde y por cuándo**. Muestra las cifras de los que ya tienen datos procesados y, para el IPC, agrega una proyección a futuro.

> **Estado:** versión entregada el 26 de noviembre de 2026, al cierre del desarrollo del Datatón. Funciona sobre una muestra de los datos; el catálogo y el proceso están pensados para incorporar el resto.

## Problema que resuelve

- Las publicaciones del INE están organizadas por tema y por dirección productora. Encontrar todo lo disponible para un lugar y un periodo concretos requiere conocer de antemano dónde buscar.
- Los metadatos del portal de datos abiertos (`datos.ine.gob.gt`) no incluyen campos de cobertura temporal ni de nivel territorial. Esos datos solo aparecen, cuando aparecen, en los títulos de los archivos.
- Los índices tienen periodos de referencia distintos (por ejemplo, IPC 2024 = 100 e IPMC diciembre 2018 = 100). Comparar publicaciones de distintos años sin esa información puede llevar a conclusiones equivocadas.

## Usuarios

- **Instituciones públicas** que usan estadísticas para planificar, focalizar programas o justificar decisiones.
- **Personal del INE**, incluidas las coordinaciones regionales y las delegaciones departamentales, que atienden solicitudes de información sobre su territorio.
- **Población general**, academia y sociedad civil que buscan datos oficiales sobre su departamento o municipio.

## Qué hace

El sitio tiene tres páginas.

### Explorar

Es la portada. Se elige un periodo en una barra de años y un lugar en el mapa, de departamento a municipio, y se puede filtrar por tema del portal y por origen (el tipo de operación y la operación estadística). El resultado es la ficha de ese lugar y ese periodo:

- **En cifras:** la población del departamento o municipio, según las proyecciones oficiales, y, con un departamento elegido, el nivel de precios estimado a partir del IPC.
- **Lo que hay del INE:** los productos que cubren ese lugar y ese periodo, agrupados por nivel territorial. Cada uno dice de qué operación estadística y de qué edición sale, y enlaza a su página en el portal.

La dirección de la página guarda la consulta, así que un enlace abre la misma ficha.

### Origen de los datos

Las operaciones estadísticas del INE, agrupadas por tipo. Al elegir una se ven su descripción, sus ediciones, de qué otras usa insumos y cuáles se alimentan de ella. Por ejemplo, la ENIGH da los ponderadores del IPC y sostiene la Canasta Básica Alimentaria y un indicador ODS.

### Calculadora del IPC

Proyecta el Índice de Precios al Consumidor hasta 24 meses, con sus intervalos y sus métricas de validación, ajustado al nivel de precios de cada departamento. Se puede indicar en qué meses se espera un fenómeno de El Niño.

La proyección y el ajuste departamental **son cálculos del equipo, no cifras oficiales del INE**, y así se identifican en la herramienta (ver [Metodología y rigor](#metodología-y-rigor)).

## Arquitectura

El detalle está en [docs/arquitectura.md](docs/arquitectura.md) y las decisiones de diseño en [docs/decisiones/](docs/decisiones/).

Principios que guían el diseño:

- **Un catálogo como pieza central.** Cada producto del INE se describe con el mismo esquema (periodo, nivel territorial, operación estadística, edición, fuente y fecha de consulta) y se organiza en operación › edición › producto. La interfaz lee el catálogo, así que agregar un producto es agregar una fila y no modificar código.
- **Datos separados de la interfaz.** El procesamiento de datos genera archivos que la interfaz consume; cada parte se puede actualizar por separado.
- **Lo oficial y lo estimado, siempre distinguibles.** Los cálculos propios se identifican visualmente y se documenta su método.

### Tecnologías

| Parte | Tecnologías |
|---|---|
| Sitio web (`web/`) | Sitio estático con Vite, React y TypeScript. Mapa con MapLibre GL JS y gráficas con Observable Plot. Sin servidor ni servicios de pago; se publica en GitHub Pages. |
| Datos (`catalogo/`, `pipeline/`) | Catálogo en CSV y scripts de Python que lo validan y generan los archivos JSON que lee el sitio. |
| Modelo (`modelos/ipc/`) | Python: statsforecast y statsmodels para el modelo SARIMAX; pandas, NumPy y SciPy para los coeficientes departamentales. |

## Instalación y uso

Requisitos: [Miniforge](https://conda-forge.org/download/) (o cualquier distribución de conda) y Node.js 20 o superior.

```bash
# 1. Entorno de Python
conda env create -f environment.yml
conda activate series-tiempo-geo

# 2. Datos: catálogo, límites, población e insumos del modelo
python pipeline/construir_catalogo.py
python pipeline/preparar_territorio.py
python pipeline/preparar_poblacion.py
python modelos/ipc/preparar_insumos.py

# 3. Modelo del IPC: abrir modelos/ipc/sarimax_coeficientes_departamentales.ipynb
#    (VS Code o Jupyter, con el kernel del entorno) y ejecutar todas las celdas.
#    La última celda exporta los resultados a web/public/datos/ipc/.
#    Después, el pronóstico para la calculadora del sitio:
python modelos/ipc/exportar_pronostico.py

# 4. Sitio web
cd web
npm install
npm run dev
```

Los archivos que lee el sitio (`web/public/datos/`) ya están en el repositorio, así que para ver el sitio basta con el paso 4.

## Datos utilizados

Todos los datos provienen del portal de datos abiertos del INE, salvo que se indique otra fuente.

| Conjunto de datos | Producido por | Licencia | Uso en el proyecto | Fecha de descarga |
|---|---|---|---|---|
| [Precios recolectados del Índice de Precios al Consumidor](https://datos.ine.gob.gt/dataset/precios-recolectados-indice-de-precios-al-consumidor/resource/c5942f26-de9e-4b08-8232-df9dcafa819d) | Departamento de Estadísticas de Precios, INE | Open Data Commons Attribution License | Estimación del nivel de precios relativo por departamento | 2026-11-23 |
| [Estimaciones y proyecciones de la población total por municipio, 2015-2030](https://datos.ine.gob.gt/dataset/proyecciones-de-poblacion-2015-2030) | Dirección de Censos y Encuestas, INE | No declarada en el portal | Población por departamento y municipio en el explorador | 2026-11-25 |
| [Empalme del IPC por República, Base Anual 2024 = 100.00](https://datos.ine.gob.gt/dataset/ipc-por-producto-ano-2024-100-0/resource/6b2cb40a-188c-47c9-9288-ba11c40b5910) | Departamento de Estadísticas de Precios, INE | Creative Commons Attribution | Serie histórica del IPC para la proyección | 2026-11-23 |
| [Estimaciones y proyecciones de población nacionales 1950-2050](https://www.ine.gob.gt/proyecciones/) | Dirección de Censos y Encuestas, INE | No declarada (publicada en www.ine.gob.gt, fuera del portal de datos abiertos) | Variable externa candidata del modelo del IPC; no quedó en el modelo final | 2026-11-25 |

**Catálogo:** los 146 productos (`catalogo/publicaciones.csv`) y las 41 operaciones estadísticas, con sus 48 ediciones y 26 relaciones (`catalogo/operaciones.csv`, `ediciones.csv` y `relaciones.csv`), se registraron consultando la API de `datos.ine.gob.gt` y las páginas de `www.ine.gob.gt` el 2026-11-25. Cada uno enlaza a su fuente original.

**Fuentes complementarias:**

| Conjunto de datos | Producido por | Licencia | Uso en el proyecto | Fecha de descarga |
|---|---|---|---|---|
| [Guatemala - Subnational Administrative Boundaries (COD-AB)](https://data.humdata.org/dataset/cod-ab-gtm) | CONRED, publicado por OCHA en HDX | CC BY-IGO | Límites de departamentos y municipios del mapa | 2026-11-25 |
| [Oceanic Niño Index (ONI), ERSSTv6](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/) | Climate Prediction Center (CPC), NOAA | Dominio público | Indicadores de El Niño y La Niña, variables externas del modelo del IPC | 2026-11-25 |

**Elaboración propia:** la variable de cambio de gobierno marca el mes en que asumió cada presidente de Guatemala desde 1983, a partir de las fechas históricas de toma de posesión.

El detalle de cómo se construye cada variable externa está en [`modelos/ipc/README.md`](modelos/ipc/README.md).

## Metodología y rigor

- Se usan únicamente datos publicados por el INE en su portal, con las definiciones y metadatos oficiales.
- Cada publicación muestra su periodo de referencia o versión metodológica.
- **Proyección del IPC:** modelo SARIMAX entrenado sobre la serie mensual del IPC nacional, con el fenómeno de El Niño como variable externa. Se evaluó fuera de muestra sobre los últimos 12 meses disponibles (noviembre 2025 a octubre 2026), con un error porcentual absoluto medio (MAPE) de 0.62 %. En el modelo final, la presencia de El Niño se asocia con un nivel del IPC aproximadamente 0.15 % mayor; es una asociación estimada, no un efecto causal. Como los valores futuros de El Niño no se conocen, el pronóstico hacia adelante se calcula por escenarios: se indica en qué meses se espera el fenómeno.
- **Estimación departamental:** coeficientes de nivel de precios relativo por departamento, calculados a partir de los precios recolectados para el IPC en 2023, comparando el mismo artículo, en la misma presentación y el mismo mes entre departamentos. El INE publica el IPC a nivel nacional y por región; estos coeficientes son una estimación del equipo y no sustituyen una cifra oficial.
- La herramienta no intenta identificar personas, hogares ni empresas, y solo trabaja con datos agregados publicados.

El detalle del modelo, su validación y los supuestos sobre las variables externas están en [`modelos/ipc/README.md`](modelos/ipc/README.md).

## Limitaciones y posibles mejoras

- **Muestra de datos.** La versión entregada funciona con una selección de publicaciones; el catálogo y el proceso están pensados para incorporar el resto.
- **Catálogo.** 146 productos; en 28 el nivel territorial está por confirmar, en algunos el periodo se infirió del título y en 41 el nivel de procesamiento es un supuesto. El sitio los marca.
- **Relaciones entre operaciones.** Salen de leer metodologías y documentos del INE; 4 de las 26 están marcadas como probables, porque el documento las sugiere sin decirlo de forma explícita.
- **Datos en el sitio.** Además del IPC, solo las proyecciones de población muestran cifras; el resto de publicaciones enlaza a su fuente.
- **Nivel territorial.** El mapa llega a municipio. Los datos por lugar poblado del Censo 2018 podrían mostrarse como tabla al seleccionar un municipio.
- **Solo datos publicados.** No se usan datos de etapas de procesamiento previas a la publicación en el portal.
- **Proyección solo del IPC.** Es la serie publicada con la longitud y la frecuencia necesarias para un modelo de pronóstico.
- **Horizonte del pronóstico.** Usar El Niño como variable externa mejora el ajuste, pero el horizonte confiable depende de las perspectivas climáticas disponibles (por ejemplo, las de INSIVUMEH). Para horizontes más largos conviene comparar varios escenarios y actualizar el pronóstico con cada nueva perspectiva.
- **Estimación departamental.** Los coeficientes de 2023 son constantes: cambian el nivel de cada departamento, pero todos conservan la variación porcentual nacional. El resultado no es un IPC departamental oficial ni el costo monetario de una canasta. Una mejora es actualizar los coeficientes y evaluar modelos territoriales con series y ponderaciones apropiadas.

## Uso de inteligencia artificial generativa

El equipo usó herramientas de IA generativa como asistentes durante el Datatón:

- **Claude Code** (Anthropic, modelo Claude Opus 5.5, también con la extensión Claude in Chrome): consultó la API pública del portal de datos abiertos y leyó páginas del portal para armar el catálogo y la clasificación por operación estadística; escribió el pipeline de datos y buena parte del código del sitio; adaptó el notebook del modelo del IPC al repositorio y verificó sus resultados; redactó documentación, incluido este README, y apoyó la estructura y los textos de la presentación y del video.
- **Codex** (OpenAI, modelo GPT-6.1 Terra): desarrollo y ajustes de la interfaz del sitio.
- **Gamma**: diseño de la presentación en PDF a partir de los textos del equipo.

El modelo del IPC lo desarrolló el equipo. De las 41 descripciones de operaciones de `catalogo/operaciones.csv`, las 32 marcadas como `propia` son resúmenes redactados con ayuda de IA y revisados por el equipo; las otras 9 citan el portal del INE.

Las decisiones de diseño, de datos y de método las tomó el equipo. Todo el código y la documentación fueron revisados por el equipo, que puede explicarlos y defenderlos.

## Servicios de pago o en la nube

El proyecto no usa servicios de pago. El sitio es estático, no necesita servidor y se publica en GitHub Pages, que es gratuito; la tipografía se carga desde Google Fonts, también gratuito.

## Componentes de terceros

| Componente | Uso | Licencia |
|---|---|---|
| NumPy | Cálculo numérico | BSD-3-Clause |
| pandas | Manejo de datos tabulares | BSD-3-Clause |
| SciPy | Álgebra dispersa y estadística | BSD-3-Clause |
| statsmodels | Diagnóstico de series de tiempo | BSD-3-Clause |
| StatsForecast | Modelos ARIMA y SARIMAX | Apache-2.0 |
| Matplotlib | Gráficas del análisis | Matplotlib License (basada en PSF) |
| ipywidgets | Panel interactivo de pronóstico en el notebook | BSD-3-Clause |
| openpyxl | Lectura de archivos Excel | MIT |
| requests, geopandas, pyarrow | Descarga y procesamiento de datos geográficos | Apache-2.0, BSD-3-Clause, Apache-2.0 |
| React | Interfaz del sitio | MIT |
| Vite | Compilación del sitio | MIT |
| TypeScript | Tipos del código del sitio | Apache-2.0 |
| MapLibre GL JS | Mapas de departamentos y municipios | BSD-3-Clause |
| Observable Plot | Gráficas del IPC | ISC |
| Ubuntu Sans (Google Fonts) | Tipografía | Ubuntu Font Licence |
| Logotipo del INE (imagotipo horizontal a color) | Pie del sitio | Kit de diseño que el INE entregó a los participantes del Datatón INE 2026 para sus propuestas |

## Equipo

| Integrante | Rol |
|---|---|
| Ceci | Estrategia y capa de datos |
| Javi | Análisis estadístico y modelo de proyección |
| Julio | Desarrollo de la interfaz y calidad técnica |

## Licencia

El código y la documentación se publican bajo la [licencia MIT](LICENSE).

Conforme a los términos del Datatón INE 2026, los integrantes conservan el reconocimiento de la autoría y otorgan al Instituto Nacional de Estadística una licencia no exclusiva, gratuita, perpetua e irrevocable para usar, reproducir, modificar, adaptar y distribuir la herramienta y su documentación para fines institucionales.

## Fuente de los datos

Instituto Nacional de Estadística (INE), Guatemala. [www.ine.gob.gt](https://www.ine.gob.gt) · [datos.ine.gob.gt](https://datos.ine.gob.gt)
