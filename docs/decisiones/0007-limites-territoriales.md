# 0007. Límites territoriales de HDX con los códigos del INE

- **Fecha:** 2026-11-25
- **Estado:** aceptada

## Contexto

El mapa necesita los límites de los 22 departamentos y de los municipios, con códigos que crucen con las bases del INE. El INE no tiene una descarga pública de límites. Las fuentes revisadas fueron los mapas del sitio del Censo 2018 (sin licencia declarada), el IGN (de pago), geoBoundaries y los límites administrativos de Guatemala publicados por OCHA en HDX con datos de CONRED.

## Decisión

Se usan los límites administrativos de Guatemala de HDX (COD-AB, fuente CONRED, licencia CC BY-IGO, revisados en octubre de 2025). Sus P-codes son los códigos del INE con el prefijo «GT» (`GT0411` = municipio `0411`, Acatenango), así que se convierten a número y cruzan directo.

`pipeline/preparar_territorio.py` descarga el archivo, verifica que los 22 departamentos coincidan con `catalogo/departamentos.csv` y genera las geometrías simplificadas para el sitio.

## Consecuencias

- Los 340 municipios de las proyecciones de población del INE cruzan con el mapa. HDX tiene dos unidades más, los lagos de Amatitlán y Atitlán, que no tienen datos.
- La fuente se cita en el README con su licencia.
- Si el INE publica sus propios límites, basta con cambiar la fuente en el script: el resto del sitio usa los códigos del INE.

## Armonización de códigos detectada

En el archivo de proyecciones de población 2015-2030, los municipios 0102 a 0117 del departamento de Guatemala aparecen como 0123 a 0138. La equivalencia se infirió por el orden y el tamaño de población de cada municipio y está documentada en `pipeline/preparar_poblacion.py`. Es el tipo de diferencia que un catálogo con códigos territoriales comunes permite detectar y documentar.
