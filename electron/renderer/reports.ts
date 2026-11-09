import { calcularSaldos, movimientosDeFolio, posiciones } from "../../src/lib/sica/engine";
import { CATEGORIA_LABEL, type SicaState } from "../../src/lib/sica/types";

export function periodo(desde: string, hasta: string) {
  const boundary = (day: string, end: boolean) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Seleccione ambas fechas del periodo.");
    const [y, m, d] = day.split("-").map(Number);
    if (y === undefined || m === undefined || d === undefined) throw new Error("Fecha inválida.");
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) throw new Error("Fecha inválida.");
    if (end) date.setHours(23, 59, 59, 999);
    return date.toISOString();
  };
  const inicio = boundary(desde, false), corte = boundary(hasta, true);
  if (inicio > corte) throw new Error("La fecha de inicio no puede ser posterior a la fecha de corte.");
  return { inicio, corte, previo: new Date(Date.parse(inicio) - 1).toISOString() };
}

export const dentro = (fecha: string, inicio: string, corte: string) => Date.parse(fecha) >= Date.parse(inicio) && Date.parse(fecha) <= Date.parse(corte);

/** Opening is before the first local day; closing includes the whole cutoff day. */
export function resumenMensual(s: SicaState, desde: string, hasta: string, persona = "") {
  const { inicio, corte, previo } = periodo(desde, hasta);
  const apertura = calcularSaldos(s.folios, previo), cierre = calcularSaldos(s.folios, corte);
  const activos = s.folios.filter((f) => ["aplicado", "revertido"].includes(f.estado) && dentro(f.fechaAutoriza ?? f.fecha, inicio, corte));
  const items = [
    ...s.armas.map((a) => ({ key: `A:${a.id}`, categoria: "Armas", nombre: a.matricula })),
    ...s.consumibles.map((c) => ({ key: `C:${c.id}`, categoria: CATEGORIA_LABEL[c.categoria], nombre: c.descripcion })),
  ];
  return items.map((item) => {
    const total = (map: Map<string, number>) => posiciones(map, item.key).filter((p) => !persona || p.per === persona).reduce((t, p) => t + p.qty, 0);
    let entradas = 0, salidas = 0, entregas = 0, devoluciones = 0;
    for (const f of activos) {
      const movs = movimientosDeFolio(f, s.folios).filter((m) => m.item === item.key);
      const delta = movs.filter((m) => !persona || m.per === persona).reduce((t, m) => t + m.delta, 0);
      entradas += Math.max(0, delta); salidas += Math.max(0, -delta);
      for (const m of movs.filter((m) => m.per && (!persona || m.per === persona))) {
        entregas += Math.max(0, m.delta); devoluciones += Math.max(0, -m.delta);
      }
    }
    return [item.categoria, item.nombre, total(apertura), entradas, salidas, entregas, devoluciones, total(cierre)];
  });
}