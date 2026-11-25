# 0002. Todo se consulta por tiempo y territorio

- **Fecha:** 2026-11-24
- **Estado:** aceptada

## Contexto

Cada publicación del INE corresponde a un periodo y a un territorio, pero hoy no hay una forma unificada de consultarlas con esos dos criterios.

## Decisión

Todo lo que se muestra en el sitio tiene una referencia temporal y una territorial. La consulta combina dos filtros: una línea de tiempo por rango de años y un mapa por departamento o municipio.

## Consecuencias

- Toda publicación que entre al sitio necesita metadatos de periodo y de nivel territorial.
- El tiempo y el territorio son dimensiones compartidas: se modelan una vez y cada publicación nueva se conecta a ellas.
- El mapa llega a municipio. El nivel de lugar poblado queda fuera del mapa por costo visual.
