import { useEffect, useRef, useState } from "react";
import { Map as MapaLibre, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
// MapLibre 6 carga su worker como archivo aparte; con ?url, Vite lo incluye en la compilación.
import urlWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { colorToken } from "./colores";
import { leerJson } from "../datos";

interface Props {
  seleccionado: number | null;
  onSeleccion: (codigo: number | null) => void;
}

setWorkerUrl(urlWorker);

const ARCHIVO = "./datos/territorio/departamentos.geojson";

/**
 * Mapa de departamentos sin mapa base: solo los polígonos, así no depende de servicios de teselas.
 * Espera un GeoJSON con la propiedad `codigo` (código de departamento del INE).
 */
export function Mapa({ seleccionado, onSeleccion }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const [sinLimites, setSinLimites] = useState(false);

  useEffect(() => {
    if (!contenedor.current) return;
    const m = new MapaLibre({
      container: contenedor.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "fondo", type: "background", paint: { "background-color": colorToken("--ine-blanco") } }],
      },
      center: [-90.3, 15.7],
      zoom: 5.6,
      attributionControl: false,
    });
    mapa.current = m;

    // Los límites se piden de inmediato, sin esperar al mapa, para avisar pronto si faltan.
    const pedido = leerJson(ARCHIVO).then((limites) => {
      if (!limites) setSinLimites(true);
      return limites;
    });

    m.on("load", async () => {
      const limites = await pedido;
      if (!limites) return;
      m.addSource("departamentos", { type: "geojson", data: limites, promoteId: "codigo" });
      m.addLayer({
        id: "relleno",
        type: "fill",
        source: "departamentos",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "seleccionado"], false],
            colorToken("--ine-azul-radiante"),
            colorToken("--ine-gris-claro"),
          ],
          "fill-opacity": 0.9,
        },
      });
      m.addLayer({
        id: "borde",
        type: "line",
        source: "departamentos",
        paint: { "line-color": colorToken("--ine-blanco"), "line-width": 1 },
      });
      m.on("click", "relleno", (e: MapLayerMouseEvent) => {
        const codigo = Number(e.features?.[0]?.properties?.codigo);
        if (codigo) onSeleccion(codigo);
      });
      m.on("mouseenter", "relleno", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "relleno", () => (m.getCanvas().style.cursor = ""));
    });

    return () => m.remove();
    // El mapa se crea una sola vez; onSeleccion es el setState del padre, que no cambia.
  }, []);

  // Resaltar el departamento seleccionado.
  useEffect(() => {
    const m = mapa.current;
    const fuente = m?.getSource("departamentos") as GeoJSONSource | undefined;
    if (!m || !fuente) return;
    m.removeFeatureState({ source: "departamentos" });
    if (seleccionado !== null) m.setFeatureState({ source: "departamentos", id: seleccionado }, { seleccionado: true });
  }, [seleccionado]);

  return (
    <div className="mapa">
      <div ref={contenedor} className="mapa-lienzo" aria-label="Mapa de departamentos de Guatemala" />
      {sinLimites && (
        <p className="mapa-aviso">
          Los límites de departamentos todavía no están cargados. Usa la lista para elegir un departamento.
        </p>
      )}
    </div>
  );
}
