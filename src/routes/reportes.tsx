import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, PageHeader, fmtFecha } from "@/components/sica/ui";
import { descargarExcel } from "@/lib/sica/excel";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { SITUACION_LABEL, useDerivado } from "@/lib/sica/hooks";
import { TIPO_FOLIO_LABEL, folioNumero, type Categoria } from "@/lib/sica/types";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — SICA" },
      { name: "description", content: "Reportes de estado de fuerza, existencias y movimientos en Excel y PDF." },
      { property: "og:title", content: "Reportes — SICA" },
      { property: "og:description", content: "Reportes de estado de fuerza, existencias y movimientos en Excel y PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reportes,
});

type Tabla = { cols: string[]; rows: (string | number)[][] };
const REPORTES = [
  ["fuerza", "Estado de fuerza general (armas)"],
  ["agrup", "Estado de fuerza por agrupamiento"],
  ["deposito", "Existencias por depósito físico"],
  ["resguardo", "Armamento bajo resguardo personal"],
  ["tipo", "Inventario por tipo y calibre"],
  ["cargador", "Existencias de cargadores"],
  ["cartucho", "Existencias de cartuchos"],
  ["granada", "Existencias de granadas"],
  ["movs", "Historial de movimientos (folios)"],
  ["transf", "Transferencias administrativas"],
  ["cancel", "Folios cancelados"],
] as const;
type Id = (typeof REPORTES)[number][0];

function Reportes() {
  const [id, setId] = useState<Id>("fuerza");
  const [corte, setCorte] = useState("");
  const [q, setQ] = useState("");
  const { s, armas, consumibles, n } = useDerivado(corte ? `${corte}T23:59:59.999Z` : undefined);
  const enInv = armas.filter((a) => a.pos);
  const conteo = (key: (a: (typeof armas)[number]) => string) => {
    const m = new Map<string, number>();
    enInv.forEach((a) => m.set(key(a), (m.get(key(a)) ?? 0) + 1));
    return [...m].sort().map(([k, v]) => [...k.split("||"), v]);
  };
  const cons = (c: Categoria): Tabla => ({
    cols: ["Descripción", "Calibre", "Detalle", "Depósito", "Agrupamiento", "Resguardo personal", "Cantidad"],
    rows: consumibles.filter((x) => x.categoria === c).flatMap((x) => x.pos.map((p) => [x.descripcion, x.calibre, x.detalle, n.dep(p.dep), n.agr(p.agr), p.per ? n.per(p.per) : "—", p.qty])),
  });
  const folioRows = (fs: typeof s.folios) => fs.sort((a, b) => a.numero - b.numero).map((f) => [folioNumero(f.numero), fmtFecha(f.fecha), TIPO_FOLIO_LABEL[f.tipo], f.estado, n.agr(f.agrupOrigenId), n.agr(f.agrupDestinoId), f.partidas.length, n.usr(f.autorizaUserId)]);
  const folioCols = ["Folio", "Fecha", "Tipo", "Estado", "Agrup. origen", "Agrup. destino", "Partidas", "Autoriza"];

  const t: Tabla = (() => {
    switch (id) {
      case "fuerza": return { cols: ["Matrícula", "Tipo", "Calibre", "Situación", "Adscripción", "Custodio", "Resguardo"], rows: enInv.map((a) => [a.matricula, a.tipo, a.calibre, SITUACION_LABEL[a.situacion], n.agr(a.pos!.agr), n.dep(a.pos!.dep), a.pos!.per ? n.per(a.pos!.per) : "—"]) };
      case "agrup": return { cols: ["Agrupamiento", "Tipo", "Armas"], rows: conteo((a) => `${n.agr(a.pos!.agr)}||${a.tipo}`) };
      case "deposito": return { cols: ["Depósito", "Agrupamiento", "Armas"], rows: conteo((a) => `${n.dep(a.pos!.dep)}||${n.agr(a.pos!.agr)}`) };
      case "resguardo": return { cols: ["Responsable", "Matrícula", "Tipo", "Adscripción"], rows: enInv.filter((a) => a.pos!.per).map((a) => [n.per(a.pos!.per), a.matricula, a.tipo, n.agr(a.pos!.agr)]) };
      case "tipo": return { cols: ["Tipo", "Calibre", "Armas"], rows: conteo((a) => `${a.tipo}||${a.calibre}`) };
      case "cargador": case "cartucho": case "granada": return cons(id);
      case "movs": return { cols: folioCols, rows: folioRows(s.folios.filter((f) => !corte || f.fecha <= `${corte}T23:59:59.999Z`)) };
      case "transf": return { cols: folioCols, rows: folioRows(s.folios.filter((f) => f.tipo === "transferencia")) };
      case "cancel": return { cols: folioCols, rows: folioRows(s.folios.filter((f) => f.estado === "cancelado")) };
    }
  })();
  const rows = q ? t.rows.filter((r) => r.join(" ").toLowerCase().includes(q.toLowerCase())) : t.rows;
  const titulo = REPORTES.find((r) => r[0] === id)![1];

  return (
    <div>
      <PageHeader title="Reportes" desc="Reportes institucionales · datos ficticios." actions={<>
        <Button variant="outline" onClick={() => void descargarExcel(`SICA_${id}${corte ? "_" + corte : ""}`, t.cols, rows).catch(() => toast.error("No se pudo generar el Excel."))}><Download />Descargar Excel (XLSX)</Button>
        <Button onClick={() => window.print()}><Printer />Imprimir / PDF</Button>
      </>} />
      <div className="no-print card mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <Field label="Reporte"><select className="field" value={id} onChange={(e) => setId(e.target.value as Id)}>{REPORTES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Fecha de corte (opcional)"><input type="date" className="field" value={corte} onChange={(e) => setCorte(e.target.value)} /></Field>
        <Field label="Buscar (matrícula, folio, responsable, agrupamiento)"><input className="field" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
      </div>
      <div className="card print-area overflow-x-auto">
        <div className="border-b p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">SICA · Datos ficticios</div>
          <div className="font-semibold">{titulo}</div>
          <div className="text-xs text-muted-foreground">Corte: {corte || "actual"} · Generado {fmtFecha(new Date().toISOString())} · {rows.length} registros</div>
        </div>
        <table className="data-table">
          <thead><tr>{t.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === "number" ? "font-mono" : ""}>{typeof c === "number" ? c.toLocaleString("es-MX") : c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="no-print mt-3 text-xs text-muted-foreground">Pendientes: diferencias de inventario y conciliaciones (requieren el módulo de conciliación).</p>
    </div>
  );
}
