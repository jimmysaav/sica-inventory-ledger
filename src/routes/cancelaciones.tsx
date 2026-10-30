import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, Empty, PageHeader, fmtFecha } from "@/components/sica/ui";
import { useDerivado } from "@/lib/sica/hooks";
import { TIPO_FOLIO_LABEL, folioNumero } from "@/lib/sica/types";

export const Route = createFileRoute("/cancelaciones")({
  head: () => ({
    meta: [
      { title: "Cancelaciones — SICA" },
      { name: "description", content: "Solicitudes y resoluciones de cancelación de folios." },
      { property: "og:title", content: "Cancelaciones — SICA" },
      { property: "og:description", content: "Solicitudes y resoluciones de cancelación de folios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cancelaciones,
});

function Cancelaciones() {
  const { s, n } = useDerivado();
  const lista = s.folios.filter((f) => f.cancelacion).sort((a, b) => b.numero - a.numero);
  return (
    <div>
      <PageHeader title="Cancelación de folios" desc="Cualquier usuario operativo puede solicitarla desde el folio. Solo el Jefe del Depósito General resuelve. Los folios cancelados conservan número y antecedentes." />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Folio</th><th>Tipo</th><th>Motivo</th><th>Solicita</th><th>Fecha</th><th>Resolución</th></tr></thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td><Link to="/folios/$id" params={{ id: f.id }} className="font-mono text-primary underline">{folioNumero(f.numero)}</Link></td>
                <td>{TIPO_FOLIO_LABEL[f.tipo]}</td>
                <td>{f.cancelacion!.motivo}</td>
                <td className="text-xs">{n.usr(f.cancelacion!.solicitaUserId)}</td>
                <td>{fmtFecha(f.cancelacion!.fechaSolicitud)}</td>
                <td>{f.cancelacion!.resultado ? <Badge tone={f.cancelacion!.resultado === "aprobada" ? "danger" : "neutral"}>{f.cancelacion!.resultado} · {n.usr(f.cancelacion!.resuelveUserId)}</Badge> : <Badge tone="warn">En trámite</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <Empty>Sin solicitudes.</Empty>}
      </div>
    </div>
  );
}
