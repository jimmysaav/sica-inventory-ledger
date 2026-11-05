import { z } from "zod";

export const password = z.string().min(12).max(200);
export const nombre = z.string().trim().min(2).max(160);
export const credenciales = z.object({ usuario: z.string().trim().min(3).max(64), password: z.string().max(200) }).strict();
export const setupSchema = z.object({ nombre, usuario: z.string().regex(/^[a-zA-Z0-9._-]{3,64}$/), password, deposito: nombre, agrupamiento: nombre }).strict();
export const personaSchema = z.object({ nombre, idInst: nombre, area: nombre, usuario: z.string().max(64), telefono: z.string().max(30), nombramiento: nombre, agrupamientoId: z.string().min(1) }).strict();
const nuevaArma = z.object({ tipo: nombre, marca: nombre, modelo: nombre, calibre: z.string().min(1).max(40), matricula: z.string().min(1).max(80), conservacion: z.enum(["bueno", "regular", "malo"]), mantenimiento: z.boolean(), refDoc: z.string().max(200), funcionamiento: z.string().max(100).optional(), manifestacionC: z.string().max(100).optional(), manifestacionD: z.string().max(100).optional(), propietario: z.enum(["Estado", "Municipio", "Defensa"]).optional(), responsableObs: z.string().max(1000).optional(), direccion: z.string().max(500).optional(), estadoLoc: z.enum(["bueno", "malo", "extraviada", "asegurada"]).optional(), informacion: z.string().max(1000).optional() }).strict();
const partida = z.object({ armaId: z.string().optional(), itemId: z.string().optional(), cantidad: z.number().int().positive() }).strict();
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("importar"), armas: z.array(nuevaArma).min(1).max(100000), modo: z.enum(["inicial", "introduccion", "actualizacion"]), referencia: nombre }).strict(),
  z.object({ type: z.literal("autorizar"), id: z.string().min(1) }).strict(),
  z.object({ type: z.literal("persona"), persona: personaSchema }).strict(),
  z.object({ type: z.literal("equipo"), descripcion: nombre, serie: nombre }).strict(),
  z.object({ type: z.literal("consumible"), categoria: z.enum(["cartucho", "cargador", "granada"]), descripcion: nombre, calibre: z.string().max(40), cantidad: z.number().int().positive().max(10000000), referencia: nombre }).strict(),
  z.object({ type: z.literal("servicio"), personaId: z.string().min(1), devolver: z.boolean(), partidas: z.array(partida).max(200), equipoIds: z.array(z.string()).max(200), passwordElemento: z.string().max(200), motivo: nombre }).strict(),
  z.object({ type: z.literal("usuario"), nombre, usuario: z.string().regex(/^[a-zA-Z0-9._-]{3,64}$/), password, rol: z.enum(["admin", "jefe", "operador", "consulta"]) }).strict(),
  z.object({ type: z.literal("passwordElemento"), personaId: z.string(), password }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;