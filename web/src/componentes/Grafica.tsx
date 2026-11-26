import { useEffect, useRef } from "react";

interface Props {
  /** Recibe el ancho disponible y devuelve el elemento que genera Observable Plot. */
  dibujar: (ancho: number) => SVGSVGElement | HTMLElement;
  etiqueta: string;
}

/** Contenedor para gráficas de Observable Plot: las vuelve a dibujar cuando cambia el ancho. */
export function Grafica({ dibujar, etiqueta }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const pintar = () => {
      // Una vista o un desplegable oculto no tiene ancho; se dibuja cuando vuelve a mostrarse.
      if (nodo.clientWidth > 0) nodo.replaceChildren(dibujar(nodo.clientWidth));
    };
    pintar();
    const observador = new ResizeObserver(pintar);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [dibujar]);

  return <div ref={contenedor} className="grafica" role="img" aria-label={etiqueta} />;
}
