# Datatómicos

Proyecto del equipo Datatómicos para el **Datatón INE 2026**, categoría Tecnológica y ciencias de datos.

El Instituto Nacional de Estadística (INE) publica encuestas, índices de precios, censos y registros administrativos que describen al país con mucho detalle. Cada publicación corresponde a un periodo y a un territorio, pero hoy esa información no está registrada de forma estructurada: para saber qué existe sobre un municipio en un rango de años hay que revisar publicación por publicación. Este proyecto organiza lo que el INE ya publica para que se pueda buscar **por dónde y por cuándo**, y para el IPC agrega una proyección a futuro.

> **Estado:** en desarrollo durante el Datatón (23 al 27 de noviembre de 2026).

## Problema que resuelve

- Las publicaciones del INE están organizadas por tema y por dirección productora. Encontrar todo lo disponible para un lugar y un periodo concretos requiere conocer de antemano dónde buscar.
- Los metadatos del portal de datos abiertos (`datos.ine.gob.gt`) no incluyen campos de cobertura temporal ni de nivel territorial. Esos datos solo aparecen, cuando aparecen, en los títulos de los archivos.
- Los índices tienen periodos de referencia distintos (por ejemplo, IPC 2024 = 100 e IPMC diciembre 2018 = 100). Comparar publicaciones de distintos años sin esa información puede llevar a conclusiones equivocadas.

## Usuarios

- **Instituciones públicas** que usan estadísticas para planificar, focalizar programas o justificar decisiones.
- **Personal del INE**, incluidas las coordinaciones regionales y las delegaciones departamentales, que atienden solicitudes de información sobre su territorio.
- **Población general**, academia y sociedad civil que buscan datos oficiales sobre su departamento o municipio.

## Qué hace

### Explorador por tiempo y territorio

Un buscador de las publicaciones del INE con dos filtros combinables:

- **Tiempo:** una línea de tiempo en la que se elige un rango de años.
- **Territorio:** un mapa en el que se selecciona un departamento o un municipio.

El resultado es la lista de publicaciones disponibles para esa combinación, con su periodo, su nivel territorial, su base metodológica y el enlace a la fuente original.

### IPC con proyección

El Índice de Precios al Consumidor publicado por el INE, junto con una proyección a 12 meses hecha con un modelo estadístico validado, sus intervalos de confianza y sus métricas de error. Incluye una estimación de cómo se ubica el nivel de precios de cada departamento respecto al promedio nacional.

La proyección y la estimación departamental **son cálculos del equipo, no cifras oficiales del INE**, y así se identifican en la herramienta (ver [Metodología y rigor](#metodología-y-rigor)).

## Arquitectura

El detalle está en [docs/arquitectura.md](docs/arquitectura.md) y las decisiones de diseño en [docs/decisiones/](docs/decisiones/).

Principios que guían el diseño:

- **Un catálogo de publicaciones como pieza central.** Cada publicación del INE se describe con el mismo esquema: periodo, nivel territorial, base metodológica, fuente y fecha de descarga. La interfaz lee el catálogo, de modo que agregar una publicación es agregar una entrada y no modificar código.
- **Datos separados de la interfaz.** El procesamiento de datos genera archivos que la interfaz consume; cada parte se puede actualizar por separado.
- **Lo oficial y lo estimado, siempre distinguibles.** Los cálculos propios se identifican visualmente y se documenta su método.

### Tecnologías

*Pendiente.*

## Instalación y uso

*Pendiente.*

## Datos utilizados

Todos los datos provienen del portal de datos abiertos del INE, salvo que se indique otra fuente.

| Conjunto de datos | Producido por | Licencia | Uso en el proyecto | Fecha de descarga |
|---|---|---|---|---|
| [Precios recolectados del Índice de Precios al Consumidor](https://datos.ine.gob.gt/dataset/precios-recolectados-indice-de-precios-al-consumidor/resource/c5942f26-de9e-4b08-8232-df9dcafa819d) | Departamento de Estadísticas de Precios, INE | Open Data Commons Attribution License | Estimación del nivel de precios relativo por departamento | 2026-11-23 |
| [Empalme del IPC por República, Base Anual 2024 = 100.00](https://datos.ine.gob.gt/dataset/ipc-por-producto-ano-2024-100-0/resource/6b2cb40a-188c-47c9-9288-ba11c40b5910) | Departamento de Estadísticas de Precios, INE | Creative Commons Attribution | Serie histórica del IPC para la proyección | 2026-11-23 |

**Fuentes complementarias:** *pendiente* (variables externas usadas en el modelo de proyección).

## Metodología y rigor

- Se usan únicamente datos publicados por el INE en su portal, con las definiciones y metadatos oficiales.
- Cada publicación muestra su periodo de referencia o versión metodológica.
- **Proyección del IPC:** modelo SARIMAX entrenado sobre la serie mensual del IPC nacional, con el fenómeno de El Niño como variable externa. Se evaluó fuera de muestra sobre los últimos 12 meses disponibles (noviembre 2025 a octubre 2026), con un error porcentual absoluto medio (MAPE) de 0.62 %.
- **Estimación departamental:** coeficientes de nivel de precios relativo por departamento, calculados a partir de los precios recolectados para el IPC en 2023, comparando el mismo artículo, en la misma presentación y el mismo mes entre departamentos. El INE publica el IPC a nivel nacional y por región; estos coeficientes son una estimación del equipo y no sustituyen una cifra oficial.
- La herramienta no intenta identificar personas, hogares ni empresas, y solo trabaja con datos agregados publicados.

<!-- Pendiente: detalle del modelo, validación y supuestos sobre las variables externas. -->

## Limitaciones y posibles mejoras

- **Muestra de datos.** La versión entregada funciona con una selección de publicaciones; el catálogo y el proceso están pensados para incorporar el resto.
- **Nivel territorial.** El mapa llega a municipio. Los datos por lugar poblado del Censo 2018 podrían mostrarse como tabla al seleccionar un municipio.
- **Solo datos publicados.** No se usan datos de etapas de procesamiento previas a la publicación en el portal.
- **Proyección solo del IPC.** Es la serie publicada con la longitud y la frecuencia necesarias para un modelo de pronóstico.

*Se completará al cerrar el desarrollo.*

## Uso de inteligencia artificial generativa

El equipo usó agentes de Claude Code (Anthropic) y Codex (OpenAI) como asistentes para revisar los metadatos del portal de datos abiertos, redactar documentación y apoyar el desarrollo de código. Todo el código y la documentación fueron revisados por el equipo, que puede explicarlos y defenderlos.

*Se completará al cerrar el desarrollo.*

## Servicios de pago o en la nube

*Pendiente.*

## Componentes de terceros

| Componente | Uso | Licencia |
|---|---|---|
| NumPy | Cálculo numérico | BSD-3-Clause |
| pandas | Manejo de datos tabulares | BSD-3-Clause |
| SciPy | Álgebra dispersa y estadística | BSD-3-Clause |
| statsmodels | Diagnóstico de series de tiempo | BSD-3-Clause |
| StatsForecast | Modelos ARIMA y SARIMAX | Apache-2.0 |
| Matplotlib | Gráficas del análisis | Matplotlib License (basada en PSF) |
| openpyxl | Lectura de archivos Excel | MIT |

*Se completará con los componentes de la interfaz.*

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
