import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useUsuario } from "@/components/sica/Shell";
import { Badge, Empty, EstadoBadge, PageHeader, fmtFecha } from "@/components/sica/ui";
import { puede } from "@/lib/sica/engine";
import { useDerivado } from "@/lib/sica/hooks";
import { TIPO_FOLIO_LABEL, folioNumero, type TipoFolio } from "@/lib/sica/types";

export const Route = createFileRoute("/folios/")({
  head: () => ({
    meta: [
      { title: "Folios documentales — SICA" },
      { name: "description", content: "Registro de folios con numeración única y consecutiva." },
      { property: "og:title", content: "Folios documentales — SICA" },
      { property: "og:description", content: "Registro de folios con numeración única y consecutiva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Folios,
});

function Folios() {
  const user = useUsuario()!;
  const { s, n } = useDerivado();
  const [tipo, setTipo] = useState<"" | TipoFolio>("");
  const [estado, setEstado] = useState("");
  const [q, setQ] = useState("");
  const lista = [...s.folios]
    .sort((a, b) => b.numero - a.numero)
    .filter((f) => (!tipo || f.tipo === tipo) && (!estado || f.estado === estado))
    .filter((f) => {
      if (!q) return true;
      const mats = f.partidas.map((p) => s.armas.find((a) => a.id === p.armaId)?.matricula ?? "").join(" ");
      return [folioNumero(f.numero), f.entrega, f.recibe, n.per(f.personaId), n.agr(f.agrupOrigenId), n.agr(f.agrupDestinoId), mats].join(" ").toLowerCase().includes(q.toLowerCase());
    });
  return (
    <div>
      <PageHeader
        title="Folios documentales"
        desc="Un folio capturado queda pendiente y no afecta existencias hasta su autorización por el Jefe del Depósito General o el Administrador."
        actions={puede(user.rol, "capturar") && <Link to="/folios/nuevo" className="btn btn-primary">Nuevo folio</Link>}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="field w-56" value={tipo} onChange={(e) => setTipo(e.target.value as TipoFolio | "")}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_FOLIO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="field w-44" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option><option value="aplicado">Aplicado</option>
          <option value="cancelado">Cancelado</option><option value="revertido">Revertido</option>
        </select>
        <input className="field w-72" placeholder="Folio, matrícula, responsable, agrupamiento…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Folio</th><th>Fecha</th><th>Tipo</th><th>Origen</th><th>Destino</th><th>Partidas</th><th>Captura</th><th>Estado</th></tr></thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td><Link to="/folios/$id" params={{ id: f.id }} className="font-mono font-medium text-primary underline">{folioNumero(f.numero)}</Link></td>
                <td className="whitespace-nowrap">{fmtFecha(f.fecha)}</td>
                <td>{TIPO_FOLIO_LABEL[f.tipo]}</td>
                <td className="text-xs">{f.depositoOrigenId ? `${n.dep(f.depositoOrigenId)} / ${n.agr(f.agrupOrigenId)}` : "—"}</td>
                <td className="text-xs">{f.personaId ? n.per(f.personaId) : f.agrupDestinoId ? `${n.dep(f.depositoDestinoId ?? f.depositoOrigenId)} / ${n.agr(f.agrupDestinoId)}` : "—"}</td>
                <td className="font-mono">{f.partidas.length}</td>
                <td className="text-xs">{n.usr(f.capturaUserId)}</td>
                <td className="space-x-1"><EstadoBadge estado={f.estado} />{f.cancelacion && !f.cancelacion.resultado && <Badge tone="danger">Cancelación solicitada</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <Empty>Sin folios.</Empty>}
      </div>
    </div>
  );
}
