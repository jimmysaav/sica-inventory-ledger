import { createFileRoute } from "@tanstack/react-router";
import { useUsuario } from "@/components/sica/Shell";
import { PageHeader, fmtFecha } from "@/components/sica/ui";
import { puede } from "@/lib/sica/engine";
import { useDerivado } from "@/lib/sica/hooks";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría — SICA" },
      { name: "description", content: "Bitácora de operaciones con usuario, fecha y hora." },
      { property: "og:title", content: "Auditoría — SICA" },
      { property: "og:description", content: "Bitácora de operaciones con usuario, fecha y hora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auditoria,
});

function Auditoria() {
  const user = useUsuario()!;
  const { s, n } = useDerivado();
  if (!puede(user.rol, "auditoria")) return <p className="text-sm text-muted-foreground">Acceso restringido a Administrador, Jefe del Depósito General y Auditor.</p>;
  return (
    <div>
      <PageHeader title="Bitácora de auditoría" desc="Registro automático de cada operación. Solo lectura." />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
          <tbody>{s.auditoria.map((a) => <tr key={a.id}><td className="whitespace-nowrap">{fmtFecha(a.fecha)}</td><td>{n.usr(a.userId)}</td><td className="font-mono text-xs">{a.accion}</td><td>{a.detalle}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
