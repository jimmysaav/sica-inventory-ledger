import type { Command } from "../contracts";
import type { SicaState, Usuario } from "../../src/lib/sica/types";
export type Session = { state: SicaState; user: Usuario; config: { depositoId: string; agrupamientoId: string }; revision: number };
type Reply<T> = { ok: true; value: T } | { ok: false; error: string };
declare global { interface Window { sicaLocal?: Record<string, (data?: unknown) => Promise<Reply<unknown>>> } }
export async function local<T>(method: string, data?: unknown): Promise<T> {
  const fn = window.sicaLocal?.[method];
  if (!fn) throw new Error("Abra esta versión desde SICA Local.exe; no conecta servicios en línea.");
  const reply = await fn(data);
  if (!reply.ok) throw new Error(reply.error);
  return reply.value as T;
}
export const command = (data: Command) => local<Session>("command", data);