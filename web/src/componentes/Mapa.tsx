import { useEffect, useRef, useState } from "react";
import {
  Map as MapaLibre,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapLayerMouseEvent,
} from "maplibre-gl";
// MapLibre 6 carga su worker como archivo aparte; con ?url, Vite lo incluye en la compilación.
import urlWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { colorToken } from "./colores";
import { ATRIBUCION_LIMITES, cargarCapa, esLago, type Capa, type ColeccionLimites } from "../territorio";

setWorkerUrl(urlWorker);

interface Props {
  capa: Capa;
  /** En la capa de municipios: el departamento que se muestra y en el que se encuadra el mapa. */
  departamento?: number;
  seleccionado: number | null;
  onSeleccion: (codigo: number | null) => void;
  etiqueta: string;
}

/** Recorre las coordenadas de una geometría y devuelve su rectángulo envolvente. */
function envolvente(coleccion: ColeccionLimites): LngLatBoundsLike {
  let [oeste, sur, este, norte] = [Infinity, Infinity, -Infinity, -Infinity];
  const recorrer = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      oeste = Math.min(oeste, x);
      este = Math.max(este, x);
      sur = Math.min(sur, y);
      norte = Math.max(norte, y);
    } else if (Array.isArray(c)) c.forEach(recorrer);
  };
  coleccion.features.forEach((f) => recorrer(f.geometry.coordinates));
  return [oeste, sur, este, norte];
}

/**
 * Mapa de límites sin mapa base: solo los polígonos, así no depende de servicios de teselas.
 * Con la capa de departamentos muestra el país; con la de municipios, los de un departamento.
 */
export function Mapa({ capa, departamento, seleccionado, onSeleccion, etiqueta }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const seleccionInicial = useRef(seleccionado);
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
      attributionControl: { compact: false },
    });
    mapa.current = m;

    // Los límites se piden de inmediato, sin esperar al mapa, para avisar pronto si faltan.
    const pedido = cargarCapa(capa).then((limites) => {
      if (!limites) {
        setSinLimites(true);
        return null;
      }
      if (departamento === undefined) return limites;
      return { ...limites, features: limites.features.filter((f) => f.properties.departamento === departamento) };
    });

    m.on("load", async () => {
      const limites = await pedido;
      if (!limites) return;
      m.addSource("limites", { type: "geojson", data: limites, promoteId: "codigo", attribution: ATRIBUCION_LIMITES });
      if (departamento !== undefined) m.fitBounds(envolvente(limites), { padding: 16, animate: false });
      const lago: ExpressionSpecification = ["==", ["%", ["get", "codigo"], 100], 0];
      m.addLayer({
        id: "relleno",
        type: "fill",
        source: "limites",
        paint: {
          "fill-color": [
            "case",
            lago,
            colorToken("--ine-seq-1"),
            ["boolean", ["feature-state", "seleccionado"], false],
            colorToken("--ine-azul-radiante"),
            colorToken("--ine-gris-claro"),
          ],
          "fill-opacity": ["case", lago, 0.5, 0.9],
        },
      });
      m.addLayer({
        id: "borde",
        type: "line",
        source: "limites",
        paint: { "line-color": colorToken("--ine-blanco"), "line-width": 1 },
      });
      if (seleccionInicial.current !== null)
        m.setFeatureState({ source: "limites", id: seleccionInicial.current }, { seleccionado: true });
      const seleccionable = (e: MapLayerMouseEvent) => {
        const codigo = Number(e.features?.[0]?.properties?.codigo);
        return codigo && !(capa === "municipios" && esLago(codigo)) ? codigo : null;
      };
      m.on("click", "relleno", (e) => {
        const codigo = seleccionable(e);
        if (codigo) onSeleccion(codigo);
      });
      m.on("mousemove", "relleno", (e) => (m.getCanvas().style.cursor = seleccionable(e) ? "pointer" : ""));
      m.on("mouseleave", "relleno", () => (m.getCanvas().style.cursor = ""));
    });

    return () => m.remove();
    // El mapa se crea una vez por capa y departamento; onSeleccion es un setState del padre, que no cambia.
  }, [capa, departamento]);

  // Resaltar lo seleccionado.
  useEffect(() => {
    seleccionInicial.current = seleccionado;
    const m = mapa.current;
    const fuente = m?.getSource("limites") as GeoJSONSource | undefined;
    if (!m || !fuente) return;
    m.removeFeatureState({ source: "limites" });
    if (seleccionado !== null) m.setFeatureState({ source: "limites", id: seleccionado }, { seleccionado: true });
  }, [seleccionado]);

  return (
    <div className="mapa">
      <div
        ref={contenedor}
        className={capa === "municipios" ? "mapa-lienzo mapa-lienzo-municipios" : "mapa-lienzo"}
        aria-label={etiqueta}
      />
      {sinLimites && (
        <p className="mapa-aviso">Los límites todavía no están cargados. Usa la lista para elegir.</p>
      )}
    </div>
  );
}
