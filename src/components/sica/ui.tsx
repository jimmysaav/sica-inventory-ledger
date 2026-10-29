import type { ReactNode } from "react";
import { toast } from "sonner";
import { SicaError } from "@/lib/sica/engine";
import { commit } from "@/lib/sica/store";
import type { EstadoFolio, SicaState } from "@/lib/sica/types";

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {desc && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "warn" | "ok" }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-foreground"}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info-soft text-primary",
  ok: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>{children}</span>;
}
export function EstadoBadge({ estado }: { estado: EstadoFolio }) {
  const map = { pendiente: ["warn", "Pendiente"], aplicado: ["ok", "Aplicado"], cancelado: ["danger", "Cancelado"], revertido: ["neutral", "Revertido"] } as const;
  const [t, l] = map[estado];
  return <Badge tone={t}>{l}</Badge>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-6 text-center text-sm text-muted-foreground">{children}</div>;
}

/** Ejecuta una acción del motor, persiste y notifica errores de validación. */
export function run(fn: () => SicaState, ok?: string): boolean {
  try {
    commit(fn());
    if (ok) toast.success(ok);
    return true;
  } catch (e) {
    toast.error(e instanceof SicaError ? e.message : "Error inesperado");
    if (!(e instanceof SicaError)) console.error(e);
    return false;
  }
}

export const fmt = (n: number) => n.toLocaleString("es-MX");
export const fmtFecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—";

export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const csv = filas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
