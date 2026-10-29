import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge, EstadoBadge, Field, PageHeader, fmt, fmtFecha } from "@/components/sica/ui";
import { SITUACION_LABEL, useDerivado } from "@/lib/sica/hooks";
import { TIPO_FOLIO_LABEL, folioNumero } from "@/lib/sica/types";

export const Route = createFileRoute("/custodia")({
  head: () => ({
    meta: [
      { title: "Adscripción y custodia — SICA" },
      { name: "description", content: "Consulta por matrícula de adscripción, custodia, resguardo y trazabilidad." },
      { property: "og:title", content: "Adscripción y custodia — SICA" },
      { property: "og:description", content: "Consulta por matrícula de adscripción, custodia, resguardo y trazabilidad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Custodia,
});

function Custodia() {
  const { s, armas, consumibles, n } = useDerivado();
  const [mat, setMat] = useState("");
  const arma = armas.find((a) => a.matricula.toLowerCase() === mat.trim().toLowerCase());
  const historial = arma ? s.folios.filter((f) => f.partidas.some((p) => p.armaId === arma.id)).sort((a, b) => b.numero - a.numero) : [];

  return (
    <div>
      <PageHeader title="Consulta de adscripción y custodia" desc="Las cuatro relaciones son independientes: adscripción administrativa, depósito custodio, responsable del resguardo y ubicación física." />
      <div className="card mb-5 p-4">
        <div className="max-w-sm">
          <Field label="Matrícula">
            <input className="field font-mono" list="mats" placeholder="Ej. FX-10000" value={mat} onChange={(e) => setMat(e.target.value)} />
            <datalist id="mats">{armas.map((a) => <option key={a.id} value={a.matricula} />)}</datalist>
          </Field>
        </div>
        {arma && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Arma", `${arma.tipo} ${arma.marca} ${arma.modelo} · ${arma.calibre}`],
              ["Adscripción", n.agr(arma.pos?.agr)],
              ["Depósito custodio", n.dep(arma.pos?.dep)],
              ["Responsable del resguardo", arma.pos?.per ? n.per(arma.pos.per) : arma.pos ? `Depositario de ${n.dep(arma.pos.dep)}` : "—"],
              ["Situación", SITUACION_LABEL[arma.situacion]],
            ].map(([k, v]) => (
              <div key={k} className="rounded border bg-muted p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-0.5 font-medium">{v}</div></div>
            ))}
          </div>
        )}
        {arma && (
          <table className="data-table mt-4">
            <thead><tr><th>Folio</th><th>Fecha</th><th>Tipo</th><th>Estado</th><th>Origen → destino</th></tr></thead>
            <tbody>
              {historial.map((f) => (
                <tr key={f.id}>
                  <td><Link to="/folios/$id" params={{ id: f.id }} className="font-mono text-primary underline">{folioNumero(f.numero)}</Link></td>
                  <td>{fmtFecha(f.fecha)}</td>
                  <td>{TIPO_FOLIO_LABEL[f.tipo]}</td>
                  <td><EstadoBadge estado={f.estado} /></td>
                  <td className="text-xs">{n.agr(f.agrupOrigenId)} → {n.agr(f.agrupDestinoId ?? f.agrupOrigenId)}{f.personaId ? ` · ${n.per(f.personaId)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {mat && !arma && <p className="mt-3 text-sm text-muted-foreground">Matrícula no encontrada.</p>}
      </div>

      <h2 className="mb-2 text-sm font-semibold">Resguardos personales vigentes</h2>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Responsable</th><th>ID institucional</th><th>Área / adscripción</th><th>Bienes bajo resguardo</th><th>Folio de extracción</th></tr></thead>
          <tbody>
            {s.personas.map((p) => {
              const a = armas.filter((x) => x.pos?.per === p.id);
              const c = consumibles.flatMap((x) => x.pos.filter((q) => q.per === p.id).map((q) => `${x.descripcion}: ${fmt(q.qty)}`));
              if (!a.length && !c.length) return null;
              const folios = s.folios.filter((f) => f.tipo === "ext_personal" && f.personaId === p.id && f.estado === "aplicado");
              return (
                <tr key={p.id}>
                  <td className="font-medium">{p.nombre}</td>
                  <td className="font-mono">{p.idInst}</td>
                  <td>{p.area} · {n.agr(p.agrupamientoId)}</td>
                  <td className="text-xs">{a.map((x) => <div key={x.id}>{x.tipo} <span className="font-mono">{x.matricula}</span></div>)}{c.map((t) => <div key={t}>{t}</div>)}</td>
                  <td className="text-xs">{folios.map((f) => <div key={f.id} className="font-mono">{folioNumero(f.numero)} · {fmtFecha(f.fechaAutoriza)}</div>)}<Badge tone="info">Vigente</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
