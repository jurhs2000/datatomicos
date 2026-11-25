/** Lee un color de los tokens del INE (estilos/ine-tokens.css) para usarlo en el mapa y las gráficas. */
export function colorToken(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}
