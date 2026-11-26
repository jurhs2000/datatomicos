# Sitio web

Interfaz del proyecto, con tres páginas: Explorar, Origen de los datos y Calculadora del IPC. Es un sitio estático, sin servidor, que lee los archivos de `public/datos/`.

## Tecnologías

| Componente | Uso | Licencia |
|---|---|---|
| [Vite](https://vite.dev) | Servidor de desarrollo y compilación | MIT |
| [React](https://react.dev) y TypeScript | Interfaz | MIT / Apache-2.0 |
| [MapLibre GL JS](https://maplibre.org) | Mapas de departamentos y municipios, sin mapa base ni servicios de teselas | BSD-3-Clause |
| [Observable Plot](https://observablehq.com/plot) | Gráficas del IPC | ISC |

La identidad visual usa los tokens del kit de diseño del Datatón INE 2026 (`src/estilos/ine-tokens.css`) y la tipografía Ubuntu Sans desde Google Fonts.

## Cómo correrlo

Requiere Node.js 22 o superior. Desde esta carpeta:

```bash
npm install
npm run dev       # servidor local en http://localhost:5173
npm test          # verifica contratos de datos, enlaces y cálculo del IPC (Node.js 22.6 o superior)
npm run build     # verifica tipos y genera dist/
npm run preview   # sirve dist/ para revisarlo antes de publicar
```

## Estructura

```
public/datos/            generado; no se edita a mano
  catalogo.json          ← pipeline/construir_catalogo.py
  territorio/            ← pipeline/construir_catalogo.py y pipeline/preparar_territorio.py
  poblacion/             ← pipeline/preparar_poblacion.py
  cifras/                ← pipeline/preparar_nacimientos.py y pipeline/preparar_establecimientos.py
  ipc/                   ← celda final de modelos/ipc/sarimax_coeficientes_departamentales.ipynb y modelos/ipc/exportar_pronostico.py
src/
  App.tsx                encabezado, navegación y pie
  navegacion.ts          rutas por hash (#/, #/origen, #/calculadora)
  datos.ts               tipos de los archivos de datos y carga
  vistas/                Explorador, Origen e Ipc (Calculadora del IPC)
  componentes/           mapa, línea de tiempo, gráficas y tarjetas de la ficha
  estilos/               tokens del INE y estilos del sitio
```

## Reglas

- **Ningún dato va escrito en el código.** Todo sale de `public/datos/`; si falta algo, se agrega en el pipeline o en el catálogo.
- **Lo estimado se marca.** Toda cifra calculada por el equipo lleva la etiqueta de estimación y su fuente.
- **Los colores salen de los tokens** (`var(--ine-…)` en CSS y `colorToken()` en TypeScript), no de valores escritos a mano.
- **Una vista nueva** se agrega en `src/vistas/`, se registra en `navegacion.ts` y `App.tsx`, y no toca las demás.

## Publicación

`.github/workflows/pages.yml` compila el sitio y lo publica en GitHub Pages cada vez que cambia `web/` en `main`. Hay que activarlo una vez en Settings → Pages → Source: «GitHub Actions».
