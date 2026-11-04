import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Warehouse, Users, Search, FileText, Ban, BarChart3, ShieldCheck, ListChecks, LogOut, Menu,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { puede, type Permiso } from "@/lib/sica/engine";
import { iniciarSesion, reiniciarDemo, useSesion, useSica } from "@/lib/sica/store";
import { ROL_LABEL } from "@/lib/sica/types";
import { Field } from "./ui";

const NAV: { to: string; label: string; icon: typeof Package; permiso?: Permiso }[] = [
  { to: "/", label: "Panel principal", icon: LayoutDashboard },
  { to: "/inventario", label: "Inventario maestro", icon: Package },
  { to: "/loc44", label: "LOC 44 · Excel", icon: FileText },
  { to: "/depositos", label: "Depósitos", icon: Warehouse },
  { to: "/agrupamientos", label: "Agrupamientos", icon: Users },
  { to: "/custodia", label: "Adscripción y custodia", icon: Search },
  { to: "/folios", label: "Folios", icon: FileText },
  { to: "/cancelaciones", label: "Cancelaciones", icon: Ban },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/auditoria", label: "Auditoría", icon: ShieldCheck, permiso: "auditoria" },
  { to: "/estado-sistema", label: "Estado del desarrollo", icon: ListChecks },
];

export function useUsuario() {
  const s = useSica();
  const id = useSesion();
  return s.usuarios.find((u) => u.id === id) ?? null;
}

export function Shell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => setMounted(true), []);
  const user = useUsuario();
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (!mounted) return <div className="min-h-screen bg-background" />;
  if (!user) return <Login />;
  return (
    <div className="flex min-h-screen w-full">
      <aside className={`no-print sticky top-0 h-screen shrink-0 bg-sidebar text-sidebar-foreground transition-all ${open ? "w-60" : "w-14"}`}>
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-3">
          <button className="rounded p-1.5 hover:bg-sidebar-accent" onClick={() => setOpen(!open)} aria-label="Contraer menú">
            <Menu className="h-4 w-4" />
          </button>
          {open && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-sidebar-primary">SICA</div>
              <div className="text-[10px] uppercase tracking-wider">Control de Armamento</div>
            </div>
          )}
        </div>
        <nav className="p-2">
          {NAV.filter((n) => !n.permiso || puede(user.rol, n.permiso)).map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                title={n.label}
                className={`mb-0.5 flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`}
              >
                <n.icon className="h-4 w-4 shrink-0" />
                {open && n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 items-center justify-between border-b bg-card px-5">
          <div className="text-xs">
            <span className="rounded bg-warning-soft px-2 py-1 font-medium text-warning">PROTOTIPO · DATOS FICTICIOS · NO OPERATIVO</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right leading-tight">
              <div className="font-medium">{user.nombre}</div>
              <div className="text-xs text-muted-foreground">{ROL_LABEL[user.rol]}</div>
            </div>
            <button className="btn" onClick={() => iniciarSesion(null)}>
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function Login() {
  const s = useSica();
  const [uid, setUid] = useState(s.usuarios[1]?.id ?? "");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 border-b pb-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Secretaría de Seguridad · Jalisco</div>
          <h1 className="mt-1 text-lg font-semibold">Sistema Integral de Control de Armamento</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Inicio de sesión <b>demostrativo</b>. Contraseña para todos los usuarios: <span className="font-mono">demo</span>.
            No es un mecanismo de autenticación seguro.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (pw !== "demo") return setErr("Credenciales inválidas.");
            iniciarSesion(uid);
          }}
        >
          <Field label="Usuario de demostración">
            <select className="field" value={uid} onChange={(e) => setUid(e.target.value)}>
              {s.usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.usuario} — {ROL_LABEL[u.rol]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contraseña">
            <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button className="btn btn-primary w-full justify-center">Ingresar</button>
        </form>
        <button className="mt-4 text-xs text-muted-foreground underline" onClick={() => confirm("¿Restaurar datos ficticios originales?") && reiniciarDemo()}>
          Restaurar datos de demostración
        </button>
      </div>
    </div>
  );
}
