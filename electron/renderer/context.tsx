import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "../../src/components/ui/button";
import { Field } from "../../src/components/sica/ui";
import { local, command, type Session } from "./api";
import type { Command } from "../contracts";

const Context = createContext<{ session: Session; execute: (c: Command) => Promise<boolean>; logout: () => void } | null>(null);
export function useLocal() { const v = useContext(Context); if (!v) throw new Error("Sin sesión local"); return v; }
export function LocalProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ usuario: "", password: "", nombre: "", deposito: "", agrupamiento: "" });
  useEffect(() => { void local<{ configured: boolean }>("status").then((s) => setConfigured(s.configured)).catch((e) => setError(e.message)); }, []);
  const logout = () => { setSession(null); setF((f) => ({ ...f, password: "" })); void local("logout").catch((e) => setError(e.message)); };
  if (!session) return <main className="mx-auto flex min-h-screen max-w-lg items-center p-6"><div className="w-full">
    <p className="mb-2 text-xs font-semibold text-warning">WINDOWS LOCAL · DATOS FICTICIOS · NO OPERATIVO</p>
    <h1 className="mb-6 text-2xl font-semibold">SICA · Depósito local</h1>
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError("");
      try { const s = await local<Session>(configured ? "login" : "setup", configured ? { usuario: f.usuario, password: f.password } : f); setSession(s); setConfigured(true); setF({ ...f, password: "" }); }
      catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir la sesión."); }
      finally { setBusy(false); }
    }}>
      {configured === false && <><h2 className="font-semibold">Configurar depósito y Jefe</h2>{(["deposito", "agrupamiento", "nombre"] as const).map((k) => <Field key={k} label={k === "nombre" ? "Nombre del Jefe" : k === "deposito" ? "Depósito" : "Agrupamiento"}><input className="field" required value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}</>}
      <Field label="Usuario"><input className="field" required autoComplete="username" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} /></Field>
      <Field label={configured ? "Contraseña" : "Contraseña (mínimo 12 caracteres)"}><input className="field" required type="password" minLength={configured ? undefined : 12} autoComplete={configured ? "current-password" : "new-password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button disabled={busy || configured === null} type="submit">{busy ? "Abriendo…" : configured ? "Ingresar" : "Crear depósito de prueba"}</Button>
    </form>
    <Button className="mt-4" variant="outline" disabled={busy || configured === null} onClick={async () => { const pw = window.prompt("Contraseña del respaldo (mínimo 12 caracteres)"); if (!pw) return; try { const r = await local<{ canceled?: boolean }>("restore", { password: pw }); if (!r.canceled) { setConfigured(true); toast.success("Respaldo restaurado. Inicie sesión."); } } catch(e) { setError(e instanceof Error ? e.message : "Error de restauración"); } }}>Restaurar respaldo</Button>
  </div></main>;
  return <Context.Provider value={{ session, logout, execute: async (c) => { setBusy(true); try { setSession(await command(c)); toast.success("Operación registrada."); return true; } catch (e) { toast.error(e instanceof Error ? e.message : "Error local"); return false; } finally { setBusy(false); } } }}><div aria-busy={busy}>{children}</div></Context.Provider>;
}