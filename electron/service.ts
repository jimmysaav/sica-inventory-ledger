import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { commandSchema, credenciales, setupSchema, password as passwordSchema } from "./contracts";
import { importarArmas, autorizarFolio, registrarPersonaLocal, registrarEquipoLocal, registrarConsumibleLocal, servicioLocal } from "../src/lib/sica/engine";
import type { SicaState, Usuario } from "../src/lib/sica/types";

type SQLDatabase = { run: (sql: string, params?: unknown[]) => void; exec: (sql: string) => { values: unknown[][] }[]; export: () => Uint8Array; close: () => void };
type SQLFactory = { Database: new (data?: Uint8Array) => SQLDatabase };
type Auth = { salt: string; hash: string; attempts: number; lockedUntil: number };
type Snapshot = { version: 1; state: SicaState; accounts: Record<string, Auth>; elementAccounts: Record<string, Auth>; config: { depositoId: string; agrupamientoId: string } };
export type Encryption = { encrypt: (data: Buffer) => Buffer; decrypt: (data: Buffer) => Buffer };
const derive = (pw: string, salt: string) => scryptSync(pw, salt, 64).toString("hex");
const hashPassword = (pw: string): Auth => { const salt = randomBytes(16).toString("hex"); return { salt, hash: derive(pw, salt), attempts: 0, lockedUntil: 0 }; };
function validatePassword(auth: Auth | undefined, pw: string) {
  if (!auth) throw new Error("Credenciales inválidas.");
  if (auth.lockedUntil > Date.now()) throw new Error("Acceso bloqueado temporalmente. Espere 15 minutos.");
  const ok = timingSafeEqual(Buffer.from(auth.hash, "hex"), Buffer.from(derive(pw, auth.salt), "hex"));
  if (!ok) { auth.attempts++; if (auth.attempts >= 5) { auth.lockedUntil = Date.now() + 15 * 60 * 1000; auth.attempts = 0; } throw new Error("Credenciales inválidas."); }
  auth.attempts = 0; auth.lockedUntil = 0;
}

export class LocalService {
  private db: SQLDatabase | null = null;
  private snapshot: Snapshot | null = null;
  private actorId: string | null = null;
  private revision = 0;
  constructor(private file: string, private crypto: Encryption, private SQL: SQLFactory) {}
  open() {
    const bytes = fs.existsSync(this.file) ? this.crypto.decrypt(fs.readFileSync(this.file)) : undefined;
    this.db = new this.SQL.Database(bytes);
    this.db.run("CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)");
    const row = this.db.exec("SELECT payload FROM snapshot WHERE id=1")[0]?.values[0]?.[0];
    if (typeof row === "string") this.snapshot = JSON.parse(row);
    return { configured: !!this.snapshot };
  }
  private save(next: Snapshot) {
    const db = this.db;
    if (!db) throw new Error("Almacén no abierto.");
    const previous = this.snapshot;
    db.run("BEGIN IMMEDIATE");
    try {
      db.run("INSERT OR REPLACE INTO snapshot(id,payload) VALUES(1,?)", [JSON.stringify(next)]);
      db.run("COMMIT");
      const encrypted = this.crypto.encrypt(Buffer.from(db.export()));
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      const fd = fs.openSync(tmp, "w", 0o600);
      try { fs.writeFileSync(fd, encrypted); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, this.file);
      this.snapshot = next; this.revision++;
    } catch (e) {
      try { db.run("ROLLBACK"); } catch { /* committed; restore authoritative in-memory snapshot */ }
      if (previous) db.run("INSERT OR REPLACE INTO snapshot(id,payload) VALUES(1,?)", [JSON.stringify(previous)]);
      else db.run("DELETE FROM snapshot");
      throw e;
    }
  }
  private requireUser() {
    const data = this.snapshot;
    const user = data?.state.usuarios.find((u) => u.id === this.actorId);
    if (!data || !user) throw new Error("Inicie sesión.");
    return { data, user };
  }
  private privileged(user: Usuario) { if (!["admin", "jefe"].includes(user.rol)) throw new Error("Operación exclusiva del administrador o jefe."); }
  private audit(s: SicaState, userId: string, accion: string, detalle: string): SicaState {
    return { ...s, auditoria: [{ id: randomUUID(), fecha: new Date().toISOString(), userId, accion, detalle }, ...s.auditoria] };
  }
  setup(input: unknown) {
    if (this.snapshot) throw new Error("El depósito ya está configurado.");
    const p = setupSchema.parse(input);
    const user: Usuario = { id: randomUUID(), nombre: p.nombre, usuario: p.usuario.toLowerCase(), rol: "jefe" };
    const dep = randomUUID(), agr = randomUUID();
    const state: SicaState = { version: 1, usuarios: [user], depositos: [{ id: dep, clave: "LOCAL", nombre: p.deposito, tipo: "general" }], agrupamientos: [{ id: agr, clave: "LOCAL", nombre: p.agrupamiento }], personas: [], armas: [], consumibles: [], folios: [], auditoria: [], equipo: [], movimientosEquipo: [] };
    this.save({ version: 1, state: this.audit(state, user.id, "DEPOSITO_CONFIGURA", "Depósito local de prueba · datos ficticios"), accounts: { [user.id]: hashPassword(p.password) }, elementAccounts: {}, config: { depositoId: dep, agrupamientoId: agr } });
    this.actorId = user.id;
    return this.read();
  }
  login(input: unknown) {
    const p = credenciales.parse(input);
    const data = this.snapshot;
    if (!data) throw new Error("Configure el depósito.");
    const user = data.state.usuarios.find((u) => u.usuario === p.usuario.toLowerCase());
    const next = structuredClone(data);
    try { validatePassword(user ? next.accounts[user.id] : undefined, p.password); }
    catch (e) { if (user) this.save(next); throw e; }
    if (!user) throw new Error("Credenciales inválidas.");
    next.state = this.audit(next.state, user.id, "ACCESO_LOCAL", "Inicio de sesión");
    this.save(next); this.actorId = user.id;
    return this.read();
  }
  logout() { this.actorId = null; }
  read() { const { data, user } = this.requireUser(); return { state: structuredClone(data.state), user: structuredClone(user), config: data.config, revision: this.revision }; }
  command(input: unknown) {
    const c = commandSchema.parse(input);
    const { data, user } = this.requireUser();
    const next = structuredClone(data);
    const cfg = next.config;
    switch (c.type) {
      case "importar": next.state = importarArmas(next.state, user.id, c.armas, c.modo, cfg.depositoId, cfg.agrupamientoId, c.referencia); break;
      case "autorizar": next.state = autorizarFolio(next.state, user.id, c.id); break;
      case "persona": next.state = registrarPersonaLocal(next.state, user.id, c.persona); break;
      case "equipo": next.state = registrarEquipoLocal(next.state, user.id, c.descripcion, c.serie); break;
      case "consumible": next.state = registrarConsumibleLocal(next.state, user.id, c, cfg.depositoId, cfg.agrupamientoId); break;
      case "servicio": {
        if (!["jefe", "operador", "depositario", "admin"].includes(user.rol)) throw new Error("No tiene permiso para entregas o devoluciones.");
        try { validatePassword(next.elementAccounts[c.personaId], c.passwordElemento); }
        catch (e) { this.save(next); throw e; }
        next.state = servicioLocal(next.state, user.id, { ...c, depositoId: cfg.depositoId, agrupamientoId: cfg.agrupamientoId }); break;
      }
      case "usuario": {
        this.privileged(user);
        if (next.state.usuarios.some((u) => u.usuario === c.usuario.toLowerCase())) throw new Error("El usuario ya existe.");
        const id = randomUUID();
        next.state.usuarios.push({ id, nombre: c.nombre, usuario: c.usuario.toLowerCase(), rol: c.rol });
        next.accounts[id] = hashPassword(c.password);
        next.state = this.audit(next.state, user.id, "USUARIO_ALTA", `${c.usuario} · ${c.rol}`); break;
      }
      case "passwordElemento": {
        this.privileged(user);
        if (!next.state.personas.some((p) => p.id === c.personaId)) throw new Error("Elemento inexistente.");
        next.elementAccounts[c.personaId] = hashPassword(c.password);
        next.state = this.audit(next.state, user.id, "ELEMENTO_PASSWORD", c.personaId); break;
      }
    }
    this.save(next);
    return this.read();
  }
  backup(pw: string): Buffer {
    passwordSchema.parse(pw);
    const { data, user } = this.requireUser(); this.privileged(user);
    const salt = randomBytes(16), iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", scryptSync(pw, salt, 32), iv);
    const plain = Buffer.from(JSON.stringify(data));
    const payload = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.from(JSON.stringify({ format: "SICA-LOCAL-1", salt: salt.toString("hex"), iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), payload: payload.toString("base64") }));
  }
  restore(bytes: Buffer, pw: string) {
    passwordSchema.parse(pw);
    const current = this.snapshot;
    if (current) this.privileged(this.requireUser().user);
    if (bytes.length > 100 * 1024 * 1024) throw new Error("Respaldo demasiado grande.");
    let restored: Snapshot;
    try {
      const b = JSON.parse(bytes.toString());
      if (b.format !== "SICA-LOCAL-1") throw new Error();
      const decipher = createDecipheriv("aes-256-gcm", scryptSync(pw, Buffer.from(b.salt, "hex"), 32), Buffer.from(b.iv, "hex"));
      decipher.setAuthTag(Buffer.from(b.tag, "hex"));
      restored = JSON.parse(Buffer.concat([decipher.update(Buffer.from(b.payload, "base64")), decipher.final()]).toString());
      this.checkSnapshot(restored);
    } catch { throw new Error("Respaldo inválido, alterado o contraseña incorrecta."); }
    restored.state = this.audit(restored.state, "sistema-local", "RESPALDO_RESTAURA", "Restauración verificada; se requiere nuevo inicio de sesión");
    this.save(restored); this.actorId = null;
    return { configured: true };
  }
  private checkSnapshot(x: Snapshot) {
    if (x.version !== 1 || !x.accounts || !x.elementAccounts || !x.config) throw new Error();
    for (const k of ["usuarios", "depositos", "agrupamientos", "personas", "armas", "consumibles", "folios", "auditoria"] as const) if (!Array.isArray(x.state[k])) throw new Error();
    if (!x.state.usuarios.some((u) => u.rol === "jefe" && x.accounts[u.id])) throw new Error();
    if (!x.state.depositos.some((d) => d.id === x.config.depositoId) || !x.state.agrupamientos.some((a) => a.id === x.config.agrupamientoId)) throw new Error();
    for (const a of Object.values(x.accounts)) if (!/^[0-9a-f]{128}$/.test(a.hash) || !/^[0-9a-f]{32}$/.test(a.salt)) throw new Error();
  }
}

export async function initSQL(assetDirectory: string) {
  const require = createRequire(path.join(assetDirectory, "package.json"));
  const init = require(path.join(assetDirectory, "sql-wasm.cjs"));
  return await init({ locateFile: () => path.join(assetDirectory, "sql-wasm.wasm") }) as SQLFactory;
}