import { useEffect, useRef, useState } from "react";
import {
  Map as MapaLibre,
  MercatorCoordinate,
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
function envolvente(coleccion: ColeccionLimites): [number, number, number, number] {
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
  const limitesVista = useRef<LngLatBoundsLike | null>(null);
  const seleccionInicial = useRef(seleccionado);
  const [sinLimites, setSinLimites] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!contenedor.current) return;
    let vigente = true;
    setSinLimites(false);
    setListo(false);
    limitesVista.current = null;
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
        if (vigente) setSinLimites(true);
        return null;
      }
      if (departamento === undefined) return limites;
      return { ...limites, features: limites.features.filter((f) => f.properties.departamento === departamento) };
    });

    m.on("load", async () => {
      const limites = await pedido;
      if (!vigente || !limites) return;
      m.addSource("limites", { type: "geojson", data: limites, promoteId: "codigo", attribution: ATRIBUCION_LIMITES });
      const [oeste, sur, este, norte] = envolvente(limites);
      if (![oeste, sur, este, norte].every(Number.isFinite)) {
        setSinLimites(true);
        return;
      }
      const vista: LngLatBoundsLike = [oeste, sur, este, norte];
      limitesVista.current = vista;
      const ajustarLimites = () => {
        const lienzo = m.getContainer();
        const anchoPantalla = lienzo.clientWidth;
        const altoPantalla = lienzo.clientHeight;
        if (anchoPantalla <= 32 || altoPantalla <= 32) return;

        const superior = MercatorCoordinate.fromLngLat([oeste, norte]);
        const inferior = MercatorCoordinate.fromLngLat([este, sur]);
        const ancho = inferior.x - superior.x;
        const alto = inferior.y - superior.y;
        const proporcion = anchoPantalla / altoPantalla;
        // El límite debe contener también el espacio vacío del encuadre con padding.
        const anchoEncuadre = Math.max(
          ancho * anchoPantalla / (anchoPantalla - 32),
          alto * altoPantalla / (altoPantalla - 32) * proporcion,
        );
        const margen = capa === "municipios" ? 1.5 : 1.1;
        const anchoLimite = Math.max(ancho * margen, anchoEncuadre * 1.01);
        const altoLimite = Math.max(alto * margen, anchoEncuadre / proporcion * 1.01);
        const centroX = (superior.x + inferior.x) / 2;
        const centroY = (superior.y + inferior.y) / 2;
        const esquinaSuperior = new MercatorCoordinate(centroX - anchoLimite / 2, centroY - altoLimite / 2).toLngLat();
        const esquinaInferior = new MercatorCoordinate(centroX + anchoLimite / 2, centroY + altoLimite / 2).toLngLat();
        m.setMaxBounds([esquinaSuperior.lng, esquinaInferior.lat, esquinaInferior.lng, esquinaSuperior.lat]);
      };
      ajustarLimites();
      m.on("resize", ajustarLimites);
      m.fitBounds(vista, { padding: 16, animate: false });
      setListo(true);
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

    return () => { vigente = false; mapa.current = null; m.remove(); };
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
      {listo && (
        <button
          type="button"
          className="boton-texto mapa-centrar"
          aria-label={`Centrar mapa ${capa === "municipios" ? "de municipios" : "de departamentos"}`}
          onClick={() => {
            if (limitesVista.current) mapa.current?.fitBounds(limitesVista.current, { padding: 16, bearing: 0, pitch: 0, animate: false });
          }}
        >
          Centrar mapa
        </button>
      )}
      {sinLimites && (
        <p className="mapa-aviso">No se pudieron cargar los límites. <button type="button" className="boton-texto" onClick={() => window.location.reload()}>Reintentar</button></p>
      )}
    </div>
  );
}
