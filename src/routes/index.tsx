import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Field, PageHeader, Stat, fmt } from "@/components/sica/ui";
import { useDerivado } from "@/lib/sica/hooks";
import type { Categoria } from "@/lib/sica/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel principal — SICA" },
      { name: "description", content: "Indicadores ejecutivos del estado de fuerza (datos ficticios)." },
      { property: "og:title", content: "Panel principal — SICA" },
      { property: "og:description", content: "Indicadores ejecutivos del estado de fuerza (datos ficticios)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [agr, setAgr] = useState("");
  const [dep, setDep] = useState("");
  const [cat, setCat] = useState<"" | "arma" | Categoria>("");
  const [corte, setCorte] = useState("");
  const { s, armas, consumibles } = useDerivado(corte ? `${corte}T23:59:59.999Z` : undefined);
  const match = (p: { dep: string; agr: string }) => (!agr || p.agr === agr) && (!dep || p.dep === dep);
  const A = armas.filter((a) => a.pos && match(a.pos));
  const total = (c: Categoria) =>
    consumibles.filter((x) => x.categoria === c).reduce((t, x) => t + x.pos.filter(match).reduce((u, p) => u + p.qty, 0), 0);
  const show = (c: string) => !cat || cat === c;
  const pend = s.folios.filter((f) => f.estado === "pendiente");
  const trasl = s.folios.filter((f) => f.tipo === "transferencia" && f.estado === "aplicado" && f.depositoDestinoId && !f.fisicoConfirmado);
  const solic = s.folios.filter((f) => f.cancelacion && !f.cancelacion.resultado);
  const sinExistencia = armas.filter((a) => !a.pos).length;

  return (
    <div>
      <PageHeader title="Panel principal" desc="Saldos calculados a partir de folios aplicados e inventario inicial. Ningún saldo es editable manualmente." />
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Agrupamiento">
          <select className="field" value={agr} onChange={(e) => setAgr(e.target.value)}>
            <option value="">Todos</option>
            {s.agrupamientos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Depósito">
          <select className="field" value={dep} onChange={(e) => setDep(e.target.value)}>
            <option value="">Todos</option>
            {s.depositos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Categoría">
          <select className="field" value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}>
            <option value="">Todas</option>
            <option value="arma">Armas</option>
            <option value="cargador">Cargadores</option>
            <option value="cartucho">Cartuchos</option>
            <option value="granada">Granadas</option>
          </select>
        </Field>
        <Field label="Fecha de corte">
          <input type="date" className="field" value={corte} onChange={(e) => setCorte(e.target.value)} />
        </Field>
      </div>

      {show("arma") && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Armas en existencia" value={fmt(A.length)} hint={`${s.armas.length} en catálogo`} />
          <Stat label="Asignadas (resguardo personal)" value={fmt(A.filter((a) => a.situacion === "resguardo_personal").length)} />
          <Stat label="Disponibles" value={fmt(A.filter((a) => a.situacion === "disponible").length)} tone="ok" />
          <Stat label="En mantenimiento" value={fmt(A.filter((a) => a.situacion === "mantenimiento").length)} />
        </div>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {show("cartucho") && <Stat label="Cartuchos" value={fmt(total("cartucho"))} />}
        {show("cargador") && <Stat label="Cargadores" value={fmt(total("cargador"))} />}
        {show("granada") && <Stat label="Granadas" value={fmt(total("granada"))} />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Folios pendientes" value={pend.length} tone={pend.length ? "warn" : undefined} hint="Requieren autorización" />
        <Stat label="Traslados físicos por confirmar" value={trasl.length} tone={trasl.length ? "warn" : undefined} />
        <Stat label="Conciliaciones pendientes" value="—" hint="Módulo pendiente de desarrollo" />
        <Stat label="Solicitudes de cancelación" value={solic.length} tone={solic.length ? "warn" : undefined} />
      </div>

      <div className="card mt-5 p-4">
        <h2 className="mb-2 text-sm font-semibold">Alertas administrativas</h2>
        <ul className="space-y-1.5 text-sm">
          {pend.map((f) => (
            <li key={f.id}>
              · Folio <Link to="/folios/$id" params={{ id: f.id }} className="font-mono text-primary underline">SICA-{String(f.numero).padStart(6, "0")}</Link> pendiente de autorización.
            </li>
          ))}
          {trasl.map((f) => <li key={f.id}>· Transferencia SICA-{String(f.numero).padStart(6, "0")} con traslado físico sin confirmar.</li>)}
          {sinExistencia > 0 && <li>· {sinExistencia} arma(s) en catálogo sin existencia (requieren folio de introducción).</li>}
          {!pend.length && !trasl.length && !sinExistencia && <li className="text-muted-foreground">Sin alertas.</li>}
        </ul>
      </div>
    </div>
  );
}
