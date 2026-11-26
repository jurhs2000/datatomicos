// Proyección del IPC por escenarios, calculada en el navegador.
// Reproduce el panel de pronóstico del notebook del IPC (modelos/ipc/) con los datos que escribe
// modelos/ipc/exportar_pronostico.py: el modelo trabaja sobre log(IPC), El Niño suma β al logaritmo
// del mes en que ocurre y no cambia la varianza, así que cualquier escenario se recalcula exacto.
// Este archivo no importa nada del sitio para poder probarlo aparte con Node.

export interface Pronostico {
  modelo: string;
  escala: string;
  historial: { inicio: string; fin: string };
  el_nino: { coeficiente: number; efecto_porcentual: number };
  z: { "80": number; "95": number };
  meses: { fecha: string; log_base: number; sigma: number }[];
}

export interface MesProyectado {
  fecha: string;
  nino: boolean;
  pronostico: number;
  inferior_80: number;
  superior_80: number;
  inferior_95: number;
  superior_95: number;
}

/**
 * @param horizonte meses a proyectar, de 1 al máximo exportado.
 * @param mesesNino periodos con El Niño (1 = el mes siguiente al último dato).
 * @param factor coeficiente departamental; 1 para el IPC nacional. Multiplica el pronóstico y sus límites.
 */
export function proyectar(
  pronostico: Pronostico,
  horizonte: number,
  mesesNino: ReadonlySet<number>,
  factor = 1,
): MesProyectado[] {
  const { coeficiente } = pronostico.el_nino;
  const z80 = pronostico.z["80"];
  const z95 = pronostico.z["95"];
  return pronostico.meses.slice(0, horizonte).map((m, i) => {
    const nino = mesesNino.has(i + 1);
    const media = m.log_base + (nino ? coeficiente : 0);
    // Corrección de sesgo al volver de logaritmos, igual que el notebook.
    const centro = Math.exp(media) * (1 + (m.sigma * m.sigma) / 2);
    return {
      fecha: m.fecha,
      nino,
      pronostico: factor * centro,
      inferior_80: factor * Math.exp(media - z80 * m.sigma),
      superior_80: factor * Math.exp(media + z80 * m.sigma),
      inferior_95: factor * Math.exp(media - z95 * m.sigma),
      superior_95: factor * Math.exp(media + z95 * m.sigma),
    };
  });
}
