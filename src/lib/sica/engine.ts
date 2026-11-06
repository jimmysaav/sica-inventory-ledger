/**
 * Motor de reglas SICA. Funciones puras: los saldos NUNCA se guardan,
 * se calculan a partir de folios aplicados (incluido el inventario inicial).
 */
import type { Arma, Folio, Partida, Persona, Rol, SicaState, TipoFolio, Usuario, Categoria } from "./types";
import { folioNumero } from "./types";

export type Permiso =
  | "capturar"
  | "autorizar"
  | "cancelar"
  | "solicitarCancelacion"
  | "revertir"
  | "catalogos"
  | "registrarArma"
  | "importarExcel"
  | "auditoria";

const PERMISOS: Record<Permiso, Rol[]> = {
  capturar: ["admin", "jefe", "operador", "depositario"],
  autorizar: ["admin", "jefe"],
  cancelar: ["jefe"], // exclusiva del jefe del Depósito General
  solicitarCancelacion: ["admin", "jefe", "operador", "depositario"],
  revertir: ["jefe"],
  catalogos: ["admin", "jefe"],
  registrarArma: ["admin", "jefe", "operador"],
  importarExcel: ["jefe"], // Demostrativo; en producción validar en servidor.
  auditoria: ["admin", "jefe", "auditor"],
};
export const puede = (rol: Rol | undefined, p: Permiso) => !!rol && PERMISOS[p].includes(rol);

export interface Mov {
  item: string; // "A:<armaId>" | "C:<consumibleId>"
  dep: string;
  agr: string;
  per: string; // "" = sin resguardo personal
  delta: number;
}
const itemKey = (p: Partida) => (p.armaId ? `A:${p.armaId}` : `C:${p.itemId}`);
export const saldoKey = (m: Omit<Mov, "delta">) => `${m.item}|${m.dep}|${m.agr}|${m.per}`;

export function movimientosDeFolio(f: Folio, folios: Folio[]): Mov[] {
  if (f.tipo === "reversion") {
    const ref = folios.find((x) => x.id === f.refFolioId);
    return ref ? movimientosDeFolio(ref, folios).map((m) => ({ ...m, delta: -m.delta })) : [];
  }
  const out: Mov[] = [];
  const dO = f.depositoOrigenId ?? "";
  const aO = f.agrupOrigenId ?? "";
  for (const p of f.partidas) {
    const item = itemKey(p);
    const q = p.cantidad;
    const add = (dep: string, agr: string, per: string, delta: number) => out.push({ item, dep, agr, per, delta });
    switch (f.tipo) {
      case "inicial":
      case "introduccion":
        add(f.depositoDestinoId ?? "", f.agrupDestinoId ?? "", "", q);
        break;
      case "extraccion":
        add(dO, aO, "", -q);
        break;
      case "transferencia": {
        // Cambio administrativo: la custodia física solo cambia si se confirmó el traslado.
        const depFinal = f.depositoDestinoId && f.fisicoConfirmado ? f.depositoDestinoId : dO;
        add(dO, aO, "", -q);
        add(depFinal, f.agrupDestinoId ?? "", "", q);
        break;
      }
      case "ext_personal":
        add(dO, aO, "", -q);
        add(dO, aO, f.personaId ?? "", q);
        break;
      case "dev_personal":
        add(dO, aO, f.personaId ?? "", -q);
        add(dO, aO, "", q);
        break;
      case "ajuste":
        add(dO, aO, "", q);
        break;
    }
  }
  return out;
}

/** Folios con efecto: aplicados y revertidos (la reversión aplicada los neutraliza). */
const conEfecto = (f: Folio) => f.estado === "aplicado" || f.estado === "revertido";

export function calcularSaldos(folios: Folio[], corte?: string, extra?: Folio): Map<string, number> {
  const s = new Map<string, number>();
  const lista = folios.filter((f) => conEfecto(f) && (!corte || (f.fechaAutoriza ?? f.fecha) <= corte));
  if (extra) lista.push(extra);
  for (const f of lista)
    for (const m of movimientosDeFolio(f, folios)) {
      const k = saldoKey(m);
      const v = (s.get(k) ?? 0) + m.delta;
      if (v === 0) s.delete(k);
      else s.set(k, v);
    }
  return s;
}

export interface Posicion {
  dep: string;
  agr: string;
  per: string;
  qty: number;
}
export function posiciones(saldos: Map<string, number>, item: string): Posicion[] {
  const out: Posicion[] = [];
  for (const [k, qty] of saldos) {
    const [i, dep = "", agr = "", per = ""] = k.split("|");
    if (i === item) out.push({ dep, agr, per, qty });
  }
  return out;
}
export const posicionArma = (s: Map<string, number>, armaId: string) =>
  posiciones(s, `A:${armaId}`).find((p) => p.qty > 0) ?? null;

export type SituacionArma = "disponible" | "resguardo_personal" | "mantenimiento" | "fuera_inventario";
export function situacionArma(a: Arma, s: Map<string, number>): SituacionArma {
  const p = posicionArma(s, a.id);
  if (!p) return "fuera_inventario";
  if (p.per) return "resguardo_personal";
  if (a.mantenimiento) return "mantenimiento";
  return "disponible";
}

/** Valida que la aplicación del folio no deje saldos negativos ni armas duplicadas. */
export function validarFolio(state: SicaState, f: Folio): string[] {
  const err: string[] = [];
  if (!f.partidas.length) err.push("El folio no tiene partidas.");
  if (f.partidas.some((p) => !(p.armaId || p.itemId))) err.push("Partida sin bien.");
  if (f.partidas.some((p) => p.armaId && p.cantidad !== 1)) err.push("Las armas se registran en cantidad 1.");
  if (f.tipo !== "ajuste" && f.tipo !== "reversion" && f.partidas.some((p) => p.cantidad <= 0))
    err.push("Las cantidades deben ser positivas.");
  const ids = f.partidas.filter((p) => p.armaId).map((p) => p.armaId);
  if (new Set(ids).size !== ids.length) err.push("Un arma aparece más de una vez en el folio.");
  const req: Partial<Record<TipoFolio, (keyof Folio)[]>> = {
    inicial: ["depositoDestinoId", "agrupDestinoId"],
    introduccion: ["depositoDestinoId", "agrupDestinoId"],
    extraccion: ["depositoOrigenId", "agrupOrigenId"],
    transferencia: ["depositoOrigenId", "agrupOrigenId", "agrupDestinoId"],
    ext_personal: ["depositoOrigenId", "agrupOrigenId", "personaId"],
    dev_personal: ["depositoOrigenId", "agrupOrigenId", "personaId"],
    ajuste: ["depositoOrigenId", "agrupOrigenId"],
    reversion: ["refFolioId"],
  };
  for (const k of req[f.tipo] ?? []) if (!f[k]) err.push(`Falta el campo obligatorio: ${String(k)}.`);
  if (f.tipo === "transferencia" && f.agrupOrigenId === f.agrupDestinoId && !f.depositoDestinoId)
    err.push("El agrupamiento destino debe ser distinto del origen.");
  if (err.length) return err;

  const despues = calcularSaldos(state.folios, undefined, { ...f, estado: "aplicado" });
  const porArma = new Map<string, number>();
  for (const [k, v] of despues) {
    if (v < 0) {
      const item = k.split("|")[0] ?? "";
      err.push(`Existencia insuficiente en origen para ${describirItem(state, item)}.`);
    }
    if (k.startsWith("A:")) {
      const id = k.split("|")[0] ?? "";
      porArma.set(id, (porArma.get(id) ?? 0) + v);
    }
  }
  for (const [id, v] of porArma)
    if (v > 1) err.push(`${describirItem(state, id)} ya se encuentra en inventario (registro duplicado).`);
  return [...new Set(err)];
}

export function describirItem(state: SicaState, item: string) {
  const [t, id] = item.split(":");
  if (t === "A") {
    const a = state.armas.find((x) => x.id === id);
    return a ? `arma ${a.matricula}` : item;
  }
  return state.consumibles.find((x) => x.id === id)?.descripcion ?? item;
}

// ---------- Acciones (validadas por rol; cada una registra auditoría) ----------
export class SicaError extends Error {}
const ahora = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

function actor(state: SicaState, userId: string, p: Permiso): Usuario {
  const u = state.usuarios.find((x) => x.id === userId);
  if (!u) throw new SicaError("Sesión inválida.");
  if (!puede(u.rol, p)) throw new SicaError("Su rol no tiene permiso para esta operación.");
  return u;
}
function audit(state: SicaState, userId: string, accion: string, detalle: string): SicaState {
  return { ...state, auditoria: [{ id: uid(), fecha: ahora(), userId, accion, detalle }, ...state.auditoria] };
}
const setFolio = (state: SicaState, f: Folio): SicaState => ({
  ...state,
  folios: state.folios.map((x) => (x.id === f.id ? f : x)),
});
const getFolio = (state: SicaState, id: string) => {
  const f = state.folios.find((x) => x.id === id);
  if (!f) throw new SicaError("Folio inexistente.");
  return f;
};

export type NuevoFolio = Omit<Folio, "id" | "numero" | "fecha" | "capturaUserId" | "estado">;

export function capturarFolio(state: SicaState, userId: string, data: NuevoFolio): { state: SicaState; folio: Folio } {
  const u = actor(state, userId, "capturar");
  if (u.rol === "depositario" && u.agrupamientoId) {
    const toca = [data.agrupOrigenId, data.agrupDestinoId].includes(u.agrupamientoId);
    if (!toca) throw new SicaError("El depositario solo puede capturar folios de su agrupamiento.");
  }
  if (data.tipo === "reversion") throw new SicaError("Las reversiones se generan desde el folio original.");
  const numero = Math.max(0, ...state.folios.map((f) => f.numero)) + 1;
  const folio: Folio = { ...data, id: `f-${uid()}`, numero, fecha: ahora(), capturaUserId: userId, estado: "pendiente" };
  const err = validarFolio(state, folio);
  if (err.length) throw new SicaError(err.join(" "));
  const s = audit({ ...state, folios: [...state.folios, folio] }, userId, "FOLIO_CAPTURA", folioNumero(numero));
  return { state: s, folio };
}

export function autorizarFolio(state: SicaState, userId: string, folioId: string): SicaState {
  actor(state, userId, "autorizar");
  const f = getFolio(state, folioId);
  if (f.estado !== "pendiente") throw new SicaError("Solo se autorizan folios pendientes.");
  if (f.cancelacion && !f.cancelacion.resultado) throw new SicaError("El folio tiene una solicitud de cancelación sin resolver.");
  const err = validarFolio(state, f);
  if (err.length) throw new SicaError(err.join(" "));
  const nf: Folio = { ...f, estado: "aplicado", autorizaUserId: userId, fechaAutoriza: ahora() };
  return audit(setFolio(state, nf), userId, "FOLIO_AUTORIZA", folioNumero(f.numero));
}

export function solicitarCancelacion(state: SicaState, userId: string, folioId: string, motivo: string): SicaState {
  actor(state, userId, "solicitarCancelacion");
  const f = getFolio(state, folioId);
  if (!motivo.trim() || motivo.trim().length < 10) throw new SicaError("El motivo es obligatorio (mínimo 10 caracteres).");
  if (f.estado !== "pendiente")
    throw new SicaError("Solo se cancelan folios sin efectos. Para folios aplicados use una reversión documentada.");
  if (f.cancelacion && !f.cancelacion.resultado) throw new SicaError("Ya existe una solicitud en trámite.");
  const nf: Folio = { ...f, cancelacion: { motivo: motivo.trim(), solicitaUserId: userId, fechaSolicitud: ahora() } };
  return audit(setFolio(state, nf), userId, "CANCELACION_SOLICITUD", `${folioNumero(f.numero)}: ${motivo.trim()}`);
}

export function resolverCancelacion(
  state: SicaState,
  userId: string,
  folioId: string,
  aprobar: boolean,
  nota: string,
): SicaState {
  actor(state, userId, "cancelar");
  const f = getFolio(state, folioId);
  if (!f.cancelacion || f.cancelacion.resultado) throw new SicaError("No hay solicitud pendiente.");
  if (f.estado !== "pendiente") throw new SicaError("El folio ya produjo efectos; proceda por reversión.");
  const nf: Folio = {
    ...f,
    estado: aprobar ? "cancelado" : f.estado,
    cancelacion: { ...f.cancelacion, resultado: aprobar ? "aprobada" : "rechazada", resuelveUserId: userId, fechaResolucion: ahora(), nota },
  };
  return audit(setFolio(state, nf), userId, aprobar ? "CANCELACION_APRUEBA" : "CANCELACION_RECHAZA", folioNumero(f.numero));
}

export function revertirFolio(state: SicaState, userId: string, folioId: string, motivo: string): SicaState {
  actor(state, userId, "revertir");
  const f = getFolio(state, folioId);
  if (f.estado !== "aplicado") throw new SicaError("Solo se revierten folios aplicados.");
  if (f.tipo === "reversion") throw new SicaError("No se revierte una reversión; capture un folio nuevo.");
  if (motivo.trim().length < 10) throw new SicaError("El motivo es obligatorio (mínimo 10 caracteres).");
  const numero = Math.max(0, ...state.folios.map((x) => x.numero)) + 1;
  const t = ahora();
  const rev: Folio = {
    id: `f-${uid()}`,
    numero,
    fecha: t,
    fechaAutoriza: t,
    tipo: "reversion",
    refFolioId: f.id,
    capturaUserId: userId,
    autorizaUserId: userId,
    entrega: f.recibe,
    recibe: f.entrega,
    partidas: f.partidas,
    obs: motivo.trim(),
    estado: "aplicado",
  };
  // Validar: saldos tras quitar efectos del original no pueden quedar negativos
  const prueba: SicaState = { ...state, folios: [...state.folios.map((x) => (x.id === f.id ? { ...x, estado: "revertido" as const } : x))] };
  const err = validarFolio(prueba, rev);
  if (err.length) throw new SicaError("No es posible revertir: " + err.join(" "));
  const s: SicaState = {
    ...state,
    folios: [...state.folios.map((x) => (x.id === f.id ? { ...x, estado: "revertido" as const, revertidoPorId: rev.id } : x)), rev],
  };
  return audit(s, userId, "FOLIO_REVERSION", `${folioNumero(f.numero)} revertido por ${folioNumero(numero)}`);
}

export function confirmarTrasladoFisico(state: SicaState, userId: string, folioId: string): SicaState {
  actor(state, userId, "autorizar");
  const f = getFolio(state, folioId);
  if (f.tipo !== "transferencia" || !f.depositoDestinoId || f.fisicoConfirmado || f.estado !== "aplicado")
    throw new SicaError("No hay traslado físico pendiente en este folio.");
  return audit(setFolio(state, { ...f, fisicoConfirmado: true }), userId, "TRASLADO_CONFIRMA", folioNumero(f.numero));
}

export function registrarArma(state: SicaState, userId: string, a: Omit<Arma, "id" | "progresivo">): SicaState {
  actor(state, userId, "registrarArma");
  const mat = a.matricula.trim().toUpperCase();
  if (!mat) throw new SicaError("La matrícula es obligatoria.");
  if (state.armas.some((x) => x.matricula.toUpperCase() === mat)) throw new SicaError(`La matrícula ${mat} ya está registrada.`);
  const progresivo = Math.max(0, ...state.armas.map((x) => x.progresivo)) + 1;
  const s = { ...state, armas: [...state.armas, { ...a, matricula: mat, id: `a-${uid()}`, progresivo }] };
  return audit(s, userId, "ARMA_ALTA_CATALOGO", `${mat} (sin existencia hasta folio de introducción)`);
}

export function altaCatalogo(
  state: SicaState,
  userId: string,
  tipo: "deposito" | "agrupamiento",
  clave: string,
  nombre: string,
): SicaState {
  actor(state, userId, "catalogos");
  if (!clave.trim() || !nombre.trim()) throw new SicaError("Clave y nombre son obligatorios.");
  const lista = tipo === "deposito" ? state.depositos : state.agrupamientos;
  if (lista.some((x) => x.clave.toUpperCase() === clave.trim().toUpperCase())) throw new SicaError("La clave ya existe.");
  const item = { id: `${tipo}-${uid()}`, clave: clave.trim().toUpperCase(), nombre: nombre.trim() };
  const s =
    tipo === "deposito"
      ? { ...state, depositos: [...state.depositos, { ...item, tipo: "regional" as const }] }
      : { ...state, agrupamientos: [...state.agrupamientos, item] };
  return audit(s, userId, tipo === "deposito" ? "DEPOSITO_ALTA" : "AGRUPAMIENTO_ALTA", item.nombre);
}

export type ArmaImportada = Omit<Arma, "id" | "progresivo">;
export type ModoImportacion = "inicial" | "introduccion" | "actualizacion";

export function registrarPersonaLocal(state: SicaState, userId: string, p: Omit<Persona, "id">): SicaState {
  actor(state, userId, "catalogos");
  if (!p.nombre.trim() || !p.idInst.trim()) throw new SicaError("Nombre y número de elemento obligatorios.");
  if (!state.agrupamientos.some((a) => a.id === p.agrupamientoId)) throw new SicaError("Adscripción inexistente.");
  if (state.personas.some((x) => x.idInst.toUpperCase() === p.idInst.toUpperCase())) throw new SicaError("Número de elemento duplicado.");
  return audit({ ...state, personas: [...state.personas, { ...p, id: `p-${uid()}` }] }, userId, "ELEMENTO_ALTA", p.idInst);
}

export function custodioEquipo(state: SicaState, equipoId: string, corte?: string): string | null {
  const movs = (state.movimientosEquipo ?? []).filter((m) => m.equipoId === equipoId && (!corte || m.fecha <= corte));
  const ultimo = movs.at(-1);
  return ultimo?.tipo === "entrega" ? ultimo.personaId : null;
}
export function registrarEquipoLocal(state: SicaState, userId: string, descripcion: string, serie: string): SicaState {
  actor(state, userId, "catalogos");
  if (!descripcion.trim() || !serie.trim()) throw new SicaError("Descripción y serie obligatorias.");
  if (state.equipo?.some((e) => e.serie.toUpperCase() === serie.trim().toUpperCase())) throw new SicaError("Serie de equipo duplicada.");
  const id = `e-${uid()}`;
  return audit({ ...state, equipo: [...(state.equipo ?? []), { id, descripcion: descripcion.trim(), serie: serie.trim().toUpperCase() }], movimientosEquipo: [...(state.movimientosEquipo ?? []), { id: uid(), equipoId: id, personaId: "", userId, fecha: ahora(), tipo: "alta", motivo: "Alta de equipo ficticio" }] }, userId, "EQUIPO_ALTA", serie);
}
export function registrarConsumibleLocal(state: SicaState, userId: string, c: { categoria: Categoria; descripcion: string; calibre: string; cantidad: number; referencia: string }, depositoId: string, agrupamientoId: string): SicaState {
  actor(state, userId, "catalogos");
  if (!c.descripcion.trim() || !Number.isSafeInteger(c.cantidad) || c.cantidad <= 0) throw new SicaError("Descripción y cantidad positiva obligatorias.");
  const id = `c-${uid()}`;
  const next = { ...state, consumibles: [...state.consumibles, { id, categoria: c.categoria, descripcion: c.descripcion.trim(), calibre: c.calibre, detalle: c.referencia }] };
  return capturarFolio(next, userId, { tipo: "introduccion", depositoDestinoId: depositoId, agrupDestinoId: agrupamientoId, entrega: c.referencia, recibe: "Depósito local", obs: c.referencia, partidas: [{ itemId: id, cantidad: c.cantidad }] }).state;
}
export function servicioLocal(state: SicaState, userId: string, data: { personaId: string; devolver: boolean; partidas: Partida[]; equipoIds: string[]; motivo: string; depositoId: string; agrupamientoId: string }): SicaState {
  actor(state, userId, "capturar");
  const persona = state.personas.find((p) => p.id === data.personaId);
  if (!persona || persona.agrupamientoId !== data.agrupamientoId) throw new SicaError("Elemento no adscrito a este depósito.");
  if (!data.partidas.length && !data.equipoIds.length) throw new SicaError("Seleccione al menos un bien.");
  if (new Set(data.equipoIds).size !== data.equipoIds.length) throw new SicaError("Equipo repetido.");
  const itemIds = data.partidas.map((p) => p.armaId ? `A:${p.armaId}` : `C:${p.itemId}`);
  if (new Set(itemIds).size !== itemIds.length) throw new SicaError("Partida duplicada.");
  for (const p of data.partidas) {
    if (p.armaId && !state.armas.some((a) => a.id === p.armaId)) throw new SicaError("Arma inexistente.");
    if (p.itemId && !state.consumibles.some((c) => c.id === p.itemId)) throw new SicaError("Consumible inexistente.");
    if (!!p.armaId === !!p.itemId) throw new SicaError("Partida inválida.");
  }
  for (const id of data.equipoIds) {
    if (!state.equipo?.some((e) => e.id === id)) throw new SicaError("Equipo inexistente.");
    const custodio = custodioEquipo(state, id);
    if (data.devolver ? custodio !== persona.id : !!custodio) throw new SicaError("Equipo no disponible para esta operación.");
  }
  let next = state;
  if (data.partidas.length) {
    const tipo = data.devolver ? "dev_personal" : "ext_personal";
    const fecha = ahora();
    const f: Folio = { id: `f-${uid()}`, numero: Math.max(0, ...state.folios.map((x) => x.numero)) + 1, fecha, fechaAutoriza: fecha, tipo,
      depositoOrigenId: data.depositoId, agrupOrigenId: data.agrupamientoId, personaId: persona.id,
      capturaUserId: userId, autorizaUserId: userId, entrega: data.devolver ? persona.nombre : "Depósito local", recibe: data.devolver ? "Depósito local" : persona.nombre,
      obs: data.motivo, partidas: data.partidas, estado: "aplicado" };
    const errors = validarFolio(state, f);
    if (errors.length) throw new SicaError(errors.join(" "));
    next = { ...state, folios: [...state.folios, f] };
  }
  const fecha = ahora();
  next = { ...next, movimientosEquipo: [...(next.movimientosEquipo ?? []), ...data.equipoIds.map((equipoId) => ({ id: uid(), equipoId, personaId: persona.id, userId, fecha, tipo: data.devolver ? "devolucion" as const : "entrega" as const, motivo: data.motivo }))] };
  return audit(next, userId, data.devolver ? "SERVICIO_DEVOLUCION" : "SERVICIO_ENTREGA", `${persona.idInst} · ${data.motivo} · ${data.partidas.length + data.equipoIds.length} partidas · identidad del elemento verificada localmente`);
}

/** Importación atómica: las altas crean un folio pendiente, nunca saldos directos. */
export function importarArmas(state: SicaState, userId: string, armas: ArmaImportada[], modo: ModoImportacion, depositoId: string, agrupamientoId: string, referencia: string): SicaState {
  actor(state, userId, "importarExcel");
  if (!armas.length) throw new SicaError("El archivo no contiene armas.");
  if (!referencia.trim()) throw new SicaError("La referencia documental es obligatoria.");
  const vistos = new Set<string>();
  for (const a of armas) {
    const mat = a.matricula.trim().toUpperCase();
    if (!mat || !a.tipo.trim() || !a.marca.trim() || !a.modelo.trim() || !a.calibre.trim()) throw new SicaError("Clase, marca, modelo, calibre y matrícula son obligatorios en cada fila.");
    if (vistos.has(mat)) throw new SicaError(`Matrícula repetida en el archivo: ${mat}.`);
    vistos.add(mat);
    const existe = state.armas.some((x) => x.matricula.toUpperCase() === mat);
    if (modo === "actualizacion" && !existe) throw new SicaError(`Matrícula no registrada: ${mat}.`);
    if (modo !== "actualizacion" && existe) throw new SicaError(`La matrícula ${mat} ya está registrada.`);
    if (a.propietario && !["Estado", "Municipio", "Defensa"].includes(a.propietario)) throw new SicaError("Propietario inválido.");
    if (a.estadoLoc && !["bueno", "malo", "extraviada", "asegurada"].includes(a.estadoLoc)) throw new SicaError("Estado LOC inválido.");
  }
  const normalizadas = armas.map((a) => ({ ...a, matricula: a.matricula.trim().toUpperCase() }));
  if (modo === "actualizacion") {
    const cambios = new Map(normalizadas.map((a) => [a.matricula, a]));
    let next = { ...state, armas: state.armas.map((a) => {
      const cambio = cambios.get(a.matricula.toUpperCase());
      return cambio ? { ...a, ...cambio, id: a.id, progresivo: a.progresivo, mantenimiento: a.mantenimiento, conservacion: a.conservacion } : a;
    }) };
    for (const a of normalizadas) {
      const anterior = state.armas.find((x) => x.matricula.toUpperCase() === a.matricula);
      next = audit(next, userId, "LOC44_ACTUALIZA_ARMA", JSON.stringify({ referencia: referencia.trim(), matricula: a.matricula, antes: anterior, despues: next.armas.find((x) => x.matricula === a.matricula) }));
    }
    return next;
  }
  if (!state.depositos.some((d) => d.id === depositoId) || !state.agrupamientos.some((a) => a.id === agrupamientoId)) throw new SicaError("Seleccione depósito y agrupamiento válidos.");
  const max = Math.max(0, ...state.armas.map((a) => a.progresivo));
  const loteId = uid();
  const nuevas = normalizadas.map((a, i) => ({ ...a, id: `a-${loteId}-${i}`, progresivo: max + i + 1 }));
  const { state: next, folio } = capturarFolio({ ...state, armas: [...state.armas, ...nuevas] }, userId, {
    tipo: modo, depositoDestinoId: depositoId, agrupDestinoId: agrupamientoId,
    entrega: referencia.trim(), recibe: state.depositos.find((d) => d.id === depositoId)?.nombre ?? "",
    obs: `Importación Excel LOC 44 · ${referencia.trim()} · ${armas.length} armas (ficticias).`,
    partidas: nuevas.map((a) => ({ armaId: a.id, cantidad: 1 })),
  });
  return audit(next, userId, "LOC44_IMPORTA", `${referencia.trim()} · ${armas.length} armas · ${folioNumero(folio.numero)} pendiente`);
}
