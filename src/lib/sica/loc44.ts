import type { ArmaImportada } from "./engine";
import type { ArmaDerivada } from "./hooks";
import type { SicaState } from "./types";

export const CAMPOS_LOC = [
  ["tipo", "Clase"], ["marca", "Marca"], ["modelo", "Modelo"], ["calibre", "Calibre"],
  ["matricula", "Matrícula"], ["funcionamiento", "Funcionamiento"],
  ["manifestacionC", "Folio de manifestación C"], ["manifestacionD", "Folio de manifestación D"],
  ["propietario", "Propietario"], ["responsableObs", "Responsable / observaciones"],
  ["direccion", "Dirección"], ["estadoLoc", "Estado LOC"], ["informacion", "Información"], ["refDoc", "Referencia documental"],
] as const;
export const CABECERAS_LOC = [...CAMPOS_LOC.map(([, label]) => label), "Municipio / agrupamiento", "Depósito custodio", "Resguardo personal"];
const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export type RevisionExcel = { armas: ArmaImportada[]; errores: { fila: number; mensaje: string }[] };

export function revisarFilasLoc(filas: string[][]): RevisionExcel {
  const errores: RevisionExcel["errores"] = [];
  const armas: ArmaImportada[] = [];
  const headers = filas[0]?.map(normal) ?? [];
  const indices = new Map(CAMPOS_LOC.map(([k, label]) => [k, headers.indexOf(normal(label))]));
  if ((indices.get("tipo") ?? -1) < 0) indices.set("tipo", headers.indexOf("tipo"));
  for (const key of ["tipo", "marca", "modelo", "calibre", "matricula"] as const)
    if ((indices.get(key) ?? -1) < 0) errores.push({ fila: 1, mensaje: `Falta la columna ${CAMPOS_LOC.find(([k]) => k === key)?.[1]}.` });
  if (errores.length) return { armas, errores };
  const vistos = new Set<string>();
  filas.slice(1).forEach((r, i) => {
    if (r.every((v) => !v.trim())) return;
    const dato = (k: typeof CAMPOS_LOC[number][0]) => r[indices.get(k) ?? -1]?.trim() ?? "";
    const mat = dato("matricula").toUpperCase();
    const err = (mensaje: string) => errores.push({ fila: i + 2, mensaje });
    for (const k of ["tipo", "marca", "modelo", "calibre", "matricula"] as const) if (!dato(k)) err(`Campo obligatorio vacío: ${k}.`);
    if (vistos.has(mat)) err(`Matrícula duplicada: ${mat}.`);
    vistos.add(mat);
    const prop = dato("propietario");
    const propietario = (["Estado", "Municipio", "Defensa"] as const).find((p) => normal(p) === normal(prop));
    if (prop && !propietario) err("Propietario debe ser Estado, Municipio o Defensa.");
    const estado = dato("estadoLoc");
    const estadoLoc = (["bueno", "malo", "extraviada", "asegurada"] as const).find((e) => normal(e) === normal(estado));
    if (estado && !estadoLoc) err("Estado LOC debe ser bueno, malo, extraviada o asegurada.");
    armas.push({ tipo: dato("tipo"), marca: dato("marca"), modelo: dato("modelo"), calibre: dato("calibre"), matricula: mat,
      funcionamiento: dato("funcionamiento"), manifestacionC: dato("manifestacionC"), manifestacionD: dato("manifestacionD"),
      propietario, responsableObs: dato("responsableObs"), direccion: dato("direccion"), estadoLoc,
      informacion: dato("informacion"), refDoc: dato("refDoc"), mantenimiento: false, conservacion: estadoLoc === "malo" ? "malo" : "bueno" });
  });
  if (!armas.length) errores.push({ fila: 2, mensaje: "No hay filas de armas." });
  return { armas, errores };
}

export function filasLoc(armas: ArmaDerivada[], state: SicaState): (string | number)[][] {
  return armas.map((a) => [
    ...CAMPOS_LOC.map(([k]) => a[k] ?? ""),
    state.agrupamientos.find((g) => g.id === a.pos?.agr)?.nombre ?? "—",
    state.depositos.find((d) => d.id === a.pos?.dep)?.nombre ?? "—",
    state.personas.find((p) => p.id === a.pos?.per)?.nombre ?? "—",
  ]);
}