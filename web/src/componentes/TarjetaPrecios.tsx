import { useMemo } from "react";
import { TarjetaCifra, type Origen } from "./TarjetaCifra";
import { enlace } from "../navegacion";
import { useJson, type Coeficientes } from "../datos";
import { proyectar, type Pronostico } from "../proyeccionIpc";

const HORIZONTE = 12;
const SIN_EL_NINO = new Set<number>();

/** IPC nacional proyectado a 12 meses y ajustado al nivel de precios de un departamento (estimación del equipo). */
interface Props {
  departamento: number;
  nombre: string;
  /** Si hay un municipio elegido: la tarjeta aclara que la cifra es del departamento. */
  municipio?: string;
  origen?: Origen;
}

export function TarjetaPrecios({ departamento, nombre, municipio, origen }: Props) {
  const pronostico = useJson<Pronostico>("ipc/pronostico.json");
  const coeficientes = useJson<Coeficientes>("ipc/coeficientes.json");

  const final = useMemo(() => {
    if (!("datos" in pronostico) || !("datos" in coeficientes)) return null;
    const coeficiente = coeficientes.datos.departamentos.find((d) => d.codigo === departamento)?.coeficiente;
    if (coeficiente === undefined) return null;
    return proyectar(pronostico.datos, HORIZONTE, SIN_EL_NINO, coeficiente)[HORIZONTE - 1];
  }, [pronostico, coeficientes, departamento]);

  if (!final) return null;
  const mes = new Date(`${final.fecha}T00:00:00Z`)
    .toLocaleDateString("es-GT", { month: "short", year: "numeric", timeZone: "UTC" })
    .replace(".", "");

  return (
    <TarjetaCifra
      titulo="Precios"
      cifra={final.pronostico.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      unidad="IPC proyectado"
      anio={mes}
      estimacion
      nota={
        `IPC nacional ajustado al nivel de precios de ${nombre} · estimación del equipo. Sin El Niño.` +
        (municipio ? ` Es la cifra del departamento: el ajuste no llega a ${municipio}.` : "")
      }
      origen={origen ?? { texto: "IPC del INE, base 2024=100 · proyección y ajuste del equipo", url: "https://www.ine.gob.gt/indice-de-precios-al-consumidor/" }}
      accion={
        <a className="boton" href={enlace("calculadora", { depto: departamento })}>
          Abrir en la calculadora del IPC
        </a>
      }
    />
  );
}
