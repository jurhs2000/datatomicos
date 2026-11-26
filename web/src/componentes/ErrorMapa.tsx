import { Component, type ErrorInfo, type ReactNode } from "react";

/** Mantiene disponibles los filtros si no se puede cargar el código del mapa. */
export class ErrorMapa extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("No se pudo mostrar el mapa", error, info);
  }

  render() {
    if (this.state.fallo) return <p role="alert">No se pudo cargar el mapa. Usa la lista para elegir. <button type="button" className="boton-texto" onClick={() => window.location.reload()}>Reintentar</button></p>;
    return this.props.children;
  }
}
