# 0004. Proyección solo para el IPC

- **Fecha:** 2026-11-24
- **Estado:** aceptada

## Contexto

Un modelo de pronóstico necesita una serie larga y de frecuencia regular. De lo publicado en el portal, el IPC es la serie que cumple esas condiciones (mensual, desde 1983).

## Decisión

Solo el IPC tiene proyección. El resto de publicaciones se muestra tal como el INE las publica.

En la sección del IPC se aplican los mismos dos ejes del explorador. En el tiempo, la proyección extiende la serie 12 meses hacia el futuro. En el territorio, se estima el nivel de precios relativo de cada departamento a partir de los precios recolectados, porque el INE publica el IPC a nivel nacional y por región.

## Consecuencias

- La sección del IPC muestra métricas de error, intervalos de confianza y el método.
- La proyección y la estimación departamental se identifican siempre como cálculos del equipo, no como cifras oficiales.
- Otra serie con longitud y frecuencia suficientes podría recibir el mismo tratamiento sin cambiar el diseño del explorador.
