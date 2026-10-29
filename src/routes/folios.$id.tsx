import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useUsuario } from "@/components/sica/Shell";
import { Badge, EstadoBadge, Field, PageHeader, fmt, fmtFecha, run } from "@/components/sica/ui";
import { autorizarFolio, confirmarTrasladoFisico, puede, resolverCancelacion, revertirFolio, solicitarCancelacion } from "@/lib/sica/engine";
import { useDerivado } from "@/lib/sica/hooks";
import { TIPO_FOLIO_LABEL, folioNumero } from "@/lib/sica/types";

export const Route = createFileRoute("/folios/$id")({
  head: () => ({
    meta: [
      { title: "Detalle de folio — SICA" },
      { name: "description", content: "Detalle documental, autorización, cancelación y reversión del folio." },
      { property: "og:title", content: "Detalle de folio — SICA" },
      { property: "og:description", content: "Detalle documental, autorización, cancelación y reversión del folio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetalleFolio,
});

function DetalleFolio() {
  const { id } = Route.useParams();
  const user = useUsuario()!;
  const { s, n } = useDerivado();
  const [motivo, setMotivo] = useState("");
  const f = s.folios.find((x) => x.id === id);
  if (!f) return <p>Folio no encontrado. <Link to="/folios" className="underline">Volver</Link></p>;
  const ref = s.folios.find((x) => x.id === f.refFolioId);
  const rev = s.folios.find((x) => x.id === f.revertidoPorId);
  const solPend = f.cancelacion && !f.cancelacion.resultado;
  const filas: [string, string][] = [
    ["Tipo de movimiento", TIPO_FOLIO_LABEL[f.tipo]],
    ["Fecha y hora de captura", fmtFecha(f.fecha)],
    ["Origen", f.depositoOrigenId ? `${n.dep(f.depositoOrigenId)} / ${n.agr(f.agrupOrigenId)}` : "—"],
    ["Destino", f.personaId ? `Resguardo de ${n.per(f.personaId)}` : f.agrupDestinoId || f.depositoDestinoId ? `${n.dep(f.depositoDestinoId ?? f.depositoOrigenId)} / ${n.agr(f.agrupDestinoId)}` : "—"],
    ["Usuario que captura", n.usr(f.capturaUserId)],
    ["Autoridad que autoriza", f.autorizaUserId ? `${n.usr(f.autorizaUserId)} · ${fmtFecha(f.fechaAutoriza)}` : "Pendiente"],
    ["Responsable que entrega", f.entrega || "—"],
    ["Responsable que recibe", f.recibe || "—"],
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`Folio ${folioNumero(f.numero)}`}
        actions={<>
          <Link to="/folios" className="btn">Volver</Link>
          <button className="btn" onClick={() => window.print()}>Imprimir / PDF</button>
        </>}
      />
      <div className="card print-area p-6">
        <div className="mb-4 flex items-start justify-between border-b pb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Secretaría de Seguridad del Estado de Jalisco · SICA</div>
            <div className="mt-1 text-lg font-semibold">{TIPO_FOLIO_LABEL[f.tipo]}</div>
            <div className="text-xs text-warning">DOCUMENTO DE PRUEBA — DATOS FICTICIOS</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold">{folioNumero(f.numero)}</div>
            <div className="mt-1 space-x-1"><EstadoBadge estado={f.estado} />{solPend && <Badge tone="danger">Cancelación solicitada</Badge>}</div>
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {filas.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="w-48 shrink-0 text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
        </dl>
        {f.tipo === "transferencia" && f.depositoDestinoId && (
          <p className="mt-3 text-sm">Traslado físico: {f.fisicoConfirmado ? <Badge tone="ok">Confirmado</Badge> : <Badge tone="warn">Pendiente de confirmación — custodia física sin cambio</Badge>}</p>
        )}
        {ref && <p className="mt-3 text-sm">Revierte el folio <Link to="/folios/$id" params={{ id: ref.id }} className="font-mono underline">{folioNumero(ref.numero)}</Link></p>}
        {rev && <p className="mt-3 text-sm">Revertido por <Link to="/folios/$id" params={{ id: rev.id }} className="font-mono underline">{folioNumero(rev.numero)}</Link></p>}

        <table className="data-table mt-5">
          <thead><tr><th>#</th><th>Bien</th><th>Identificación</th><th>Cantidad</th></tr></thead>
          <tbody>
            {f.partidas.map((p, i) => {
              const a = s.armas.find((x) => x.id === p.armaId);
              const c = s.consumibles.find((x) => x.id === p.itemId);
              return <tr key={i}><td>{i + 1}</td><td>{a ? `${a.tipo} ${a.marca} ${a.modelo} ${a.calibre}` : c?.descripcion}</td><td className="font-mono text-xs">{a ? a.matricula : c?.detalle}</td><td className="font-mono">{fmt(p.cantidad)}</td></tr>;
            })}
          </tbody>
        </table>
        <div className="mt-4 text-sm"><span className="text-muted-foreground">Observaciones: </span>{f.obs || "—"}</div>
        {f.cancelacion && (
          <div className="mt-4 rounded border p-3 text-sm">
            <div className="font-medium">Solicitud de cancelación</div>
            <div>Motivo: {f.cancelacion.motivo}</div>
            <div className="text-xs text-muted-foreground">Solicita {n.usr(f.cancelacion.solicitaUserId)} · {fmtFecha(f.cancelacion.fechaSolicitud)}</div>
            {f.cancelacion.resultado && <div className="text-xs text-muted-foreground">Resolución: {f.cancelacion.resultado} por {n.usr(f.cancelacion.resuelveUserId)} · {fmtFecha(f.cancelacion.fechaResolucion)}</div>}
          </div>
        )}
        <div className="mt-10 grid grid-cols-3 gap-6 text-center text-xs">
          {["Entrega", "Recibe", "Autoriza"].map((t) => <div key={t} className="border-t pt-2 text-muted-foreground">{t} — firma pendiente</div>)}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Evidencias documentales y firma electrónica: pendientes de desarrollo.</p>
      </div>

      <div className="no-print card mt-4 space-y-3 p-5">
        <div className="text-sm font-semibold">Acciones</div>
        <div className="flex flex-wrap gap-2">
          {f.estado === "pendiente" && puede(user.rol, "autorizar") && (
            <button className="btn btn-primary" onClick={() => run(() => autorizarFolio(s, user.id, f.id), "Folio autorizado y aplicado")}>Autorizar y aplicar</button>
          )}
          {f.tipo === "transferencia" && f.estado === "aplicado" && f.depositoDestinoId && !f.fisicoConfirmado && puede(user.rol, "autorizar") && (
            <button className="btn" onClick={() => run(() => confirmarTrasladoFisico(s, user.id, f.id), "Traslado físico confirmado")}>Confirmar recepción física</button>
          )}
          {solPend && puede(user.rol, "cancelar") && <>
            <button className="btn btn-danger" onClick={() => run(() => resolverCancelacion(s, user.id, f.id, true, motivo), "Folio cancelado")}>Aprobar cancelación</button>
            <button className="btn" onClick={() => run(() => resolverCancelacion(s, user.id, f.id, false, motivo), "Solicitud rechazada")}>Rechazar solicitud</button>
          </>}
        </div>
        {((f.estado === "pendiente" && !solPend && puede(user.rol, "solicitarCancelacion")) || (f.estado === "aplicado" && f.tipo !== "reversion" && puede(user.rol, "revertir"))) && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="min-w-80 flex-1"><Field label="Motivo (obligatorio)"><input className="field" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Field></div>
            {f.estado === "pendiente" && <button className="btn" onClick={() => run(() => solicitarCancelacion(s, user.id, f.id, motivo), "Solicitud de cancelación registrada") && setMotivo("")}>Solicitar cancelación</button>}
            {f.estado === "aplicado" && <button className="btn btn-danger" onClick={() => confirm("Se generará un folio de reversión. ¿Continuar?") && run(() => revertirFolio(s, user.id, f.id, motivo), "Reversión documentada generada")}>Revertir con folio</button>}
          </div>
        )}
        {f.estado === "aplicado" && <p className="text-xs text-muted-foreground">Un folio aplicado ya produjo efectos: no se cancela, se revierte mediante un nuevo folio (exclusivo del Jefe del Depósito General).</p>}
      </div>
    </div>
  );
}
