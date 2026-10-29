import { useMemo } from "react";
import { calcularSaldos, posicionArma, posiciones, situacionArma } from "./engine";
import { useSica } from "./store";
import type { SicaState } from "./types";

export function nombres(s: SicaState) {
  const dep = (id?: string) => s.depositos.find((d) => d.id === id)?.nombre ?? "—";
  const agr = (id?: string) => s.agrupamientos.find((d) => d.id === id)?.nombre ?? "—";
  const per = (id?: string) => s.personas.find((d) => d.id === id)?.nombre ?? "—";
  const usr = (id?: string) => s.usuarios.find((d) => d.id === id)?.nombre ?? "—";
  return { dep, agr, per, usr };
}

/** Vista derivada: posición de cada arma y existencias de consumibles calculadas desde folios. */
export function useDerivado(corte?: string) {
  const s = useSica();
  return useMemo(() => {
    const saldos = calcularSaldos(s.folios, corte);
    const armas = s.armas.map((a) => ({ ...a, pos: posicionArma(saldos, a.id), situacion: situacionArma(a, saldos) }));
    const consumibles = s.consumibles.map((c) => ({ ...c, pos: posiciones(saldos, `C:${c.id}`) }));
    return { s, saldos, armas, consumibles, n: nombres(s) };
  }, [s, corte]);
}
export type ArmaDerivada = ReturnType<typeof useDerivado>["armas"][number];

export const SITUACION_LABEL = {
  disponible: "Disponible",
  resguardo_personal: "Resguardo personal",
  mantenimiento: "Mantenimiento",
  fuera_inventario: "Sin existencia",
} as const;
