# 0009. Gráficas con escala y notas junto a las cifras

- **Fecha:** 2026-11-26
- **Estado:** propuesta en evaluación

## Contexto

Las tendencias pequeñas sin eje vertical permiten reconocer la dirección de una serie, pero dificultan comparar magnitudes y leer unidades. Las tarjetas también necesitan aclaraciones sobre cobertura, territorio y método con una presentación consistente.

## Propuesta

- En los productos con indicadores anuales, representar los conteos con columnas y eje vertical desde cero, con unidades y años explícitos.
- Mostrar cada porcentaje como una barra independiente sobre una escala de 0 a 100, con numerador y denominador. Su evolución anual y tabla siguen disponibles en un desplegable; la línea usa una escala de 0 a 100.
- Mantener el rango seleccionado resaltado y las alternativas tabulares. Las tasas futuras usan una línea con su unidad y escala desde cero.
- Compartir un componente de notas de lectura entre población, precios y productos adicionales. Las notas acompañan la tarjeta o el indicador al que se refieren.
- Conservar los metadatos metodológicos del pipeline; cualquier aclaración específica nueva debe incorporarse a esos metadatos, sin reglas por producto en la interfaz.

## Consecuencias

La implementación usa Observable Plot y los tokens existentes. No introduce dependencias ni cambia las cifras o su agregación. La elección depende del tipo de indicador, por lo que un producto nuevo conserva la misma presentación. Se evaluará la propuesta visual antes de considerarla definitiva.
