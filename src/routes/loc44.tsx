import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer, Upload, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUsuario } from "@/components/sica/Shell";
import { ImportarLoc } from "@/components/sica/ImportarLoc";
import { Empty, Field, PageHeader } from "@/components/sica/ui";
import { puede } from "@/lib/sica/engine";
import { descargarExcel } from "@/lib/sica/excel";
import { useDerivado } from "@/lib/sica/hooks";
import { CABECERAS_LOC, filasLoc } from "@/lib/sica/loc44";

export const Route = createFileRoute("/loc44")({
  head: () => ({ meta: [
    { title: "LOC 44 — SICA" }, { name: "description", content: "Listado LOC 44 de demostración, importación y exportación Excel e impresión." },
    { property: "og:title", content: "LOC 44 — SICA" }, { property: "og:description", content: "Control documental LOC 44 con información exclusivamente ficticia." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Loc44,
});

function Loc44() {
  const user = useUsuario();
  const { s, armas } = useDerivado();
  const [q, setQ] = useState("");
  const [dep, setDep] = useState("");
  const [agr, setAgr] = useState("");
  const [importar, setImportar] = useState(false);
  if (!user) return null;
  const scope = user.rol === "depositario" ? user.agrupamientoId : undefined;
  const lista = armas.filter((a) => (!scope || a.pos?.agr === scope) && (!dep || a.pos?.dep === dep) && (!agr || a.pos?.agr === agr));
  const rows = filasLoc(lista, s).filter((r) => r.join(" ").toLowerCase().includes(q.toLowerCase()));
  return <div>
    <PageHeader title="LOC 44" desc="Listado institucional de demostración · armas registradas y datos documentales." actions={<>
      {puede(user.rol, "importarExcel") && <Button variant="outline" onClick={() => setImportar(!importar)}><Upload />Importar Excel</Button>}
      <Button variant="outline" onClick={() => void descargarExcel("SICA_LOC44_ficticia", CABECERAS_LOC, rows).catch(() => toast.error("No se pudo generar el Excel."))}><Download />Exportar Excel</Button>
      <Button onClick={() => window.print()}><Printer />Imprimir LOC 44</Button>
    </>} />
    {importar && <ImportarLoc userId={user.id} onClose={() => setImportar(false)} />}
    <div className="no-print mb-4 grid gap-3 sm:grid-cols-3">
      <Field label="Buscar"><input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Matrícula, marca, folio, propietario…" /></Field>
      <Field label="Depósito"><select className="field" value={dep} onChange={(e) => setDep(e.target.value)}><option value="">Todos</option>{s.depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></Field>
      <Field label="Municipio / agrupamiento"><select className="field" value={agr} onChange={(e) => setAgr(e.target.value)}><option value="">Todos</option>{s.agrupamientos.filter((g) => !scope || g.id === scope).map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></Field>
    </div>
    <div className="print-area loc44-print overflow-x-auto border">
      <div className="border-b py-3 px-4"><h2 className="font-semibold">Secretaría de Seguridad · Jalisco · LOC 44</h2><p className="text-xs text-muted-foreground">DATOS FICTICIOS · NO OPERATIVO · {rows.length.toLocaleString("es-MX")} armas · {new Date().toLocaleDateString("es-MX")}</p></div>
      <table className="data-table"><thead><tr>{CABECERAS_LOC.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c || "—"}</td>)}</tr>)}</tbody></table>
      {!rows.length && <Empty>Sin resultados.</Empty>}
    </div>
    <div className="no-print mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>Campos vacíos: información no capturada. Adscripción y custodia solo cambian mediante folios.</span><Button asChild size="sm" variant="link"><Link to="/folios/nuevo">Nuevo movimiento<ArrowRight /></Link></Button></div>
  </div>;
}