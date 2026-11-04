import { useState } from "react";
import { Upload, Download, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, run } from "./ui";
import { importarArmas, type ModoImportacion } from "@/lib/sica/engine";
import { descargarExcel, leerExcel } from "@/lib/sica/excel";
import { CAMPOS_LOC, revisarFilasLoc, type RevisionExcel } from "@/lib/sica/loc44";
import { useSica } from "@/lib/sica/store";

export function ImportarLoc({ userId, onClose }: { userId: string; onClose: () => void }) {
  const s = useSica();
  const [modo, setModo] = useState<ModoImportacion>("inicial");
  const [dep, setDep] = useState("dep-gral");
  const [agr, setAgr] = useState("");
  const [ref, setRef] = useState("");
  const [revision, setRevision] = useState<RevisionExcel | null>(null);
  const [busy, setBusy] = useState(false);
  const [nombre, setNombre] = useState("");
  const [ficticio, setFicticio] = useState(false);
  const existentes = new Set(s.armas.map((a) => a.matricula.toUpperCase()));
  const conflictos = revision?.armas.flatMap((a, i) => {
    const existe = existentes.has(a.matricula);
    return (modo === "actualizacion" ? !existe : existe) ? [{ fila: i + 2, mensaje: `${a.matricula}: ${existe ? "ya registrada" : "no registrada"}.` }] : [];
  }) ?? [];
  const errores = [...(revision?.errores ?? []), ...conflictos];
  return <section className="no-print mb-5 border-y py-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">Importación Excel · LOC 44</h2>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => void descargarExcel("SICA_plantilla_LOC44", CAMPOS_LOC.map(([, l]) => l), []).catch(() => toast.error("No se pudo descargar la plantilla."))}><Download />Plantilla XLSX</Button>
        <Button variant="ghost" size="icon" title="Cerrar importación" aria-label="Cerrar importación" onClick={onClose}><X /></Button>
      </div>
    </div>
    <p className="mb-3 text-sm text-warning">Solo datos ficticios. No importe inventarios reales ni información personal u operativa.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Tipo de carga"><select className="field" value={modo} onChange={(e) => setModo(e.target.value as ModoImportacion)}>
        <option value="inicial">Inventario inicial</option><option value="introduccion">Compra / introducción</option><option value="actualizacion">Actualizar datos documentales</option>
      </select></Field>
      <Field label="Referencia documental"><input className="field" value={ref} onChange={(e) => setRef(e.target.value)} required /></Field>
      {modo !== "actualizacion" && <>
        <Field label="Depósito destino"><select className="field" value={dep} onChange={(e) => setDep(e.target.value)}>{s.depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></Field>
        <Field label="Municipio / agrupamiento destino"><select className="field" value={agr} onChange={(e) => setAgr(e.target.value)}><option value="">Seleccionar…</option>{s.agrupamientos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></Field>
      </>}
    </div>
    <p className="my-3 text-xs text-muted-foreground">{modo === "actualizacion" ? "Actualiza por matrícula sin cambiar adscripción, custodia ni resguardo. Cada registro conserva sus datos anteriores en auditoría. Las columnas documentales vacías sustituyen el valor anterior; conservación y mantenimiento se conservan." : "El lote se asigna al destino seleccionado. La carga crea un folio pendiente; las existencias cambian al autorizarlo. Para distintos destinos, use lotes separados."}</p>
    <Field label="Archivo Excel (.xlsx) · primera hoja, encabezados en fila 1"><input type="file" accept=".xlsx" disabled={busy} className="block max-w-full text-sm" onChange={async (e) => {
      const file = e.target.files?.[0];
      setRevision(null); setNombre("");
      if (!file) return;
      setBusy(true);
      try { setRevision(revisarFilasLoc(await leerExcel(file))); setNombre(file.name); }
      catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo leer el Excel."); }
      finally { setBusy(false); }
    }} /></Field>
    {busy && <p className="mt-3 text-sm" role="status">Revisando archivo…</p>}
    {revision && <div className="mt-4">
      <p className="mb-2 text-sm font-medium">{nombre} · {revision.armas.length.toLocaleString("es-MX")} armas · {errores.length} errores</p>
      {errores.length > 0 ? <div className="max-h-48 overflow-auto border p-3 text-sm text-destructive" role="alert">{errores.slice(0, 100).map((err, i) => <div key={i}>Fila {err.fila}: {err.mensaje}</div>)}{errores.length > 100 && <p>Se muestran los primeros 100 errores.</p>}</div> : <div className="overflow-x-auto border">
        <table className="data-table"><thead><tr><th>Matrícula</th><th>Clase</th><th>Marca</th><th>Modelo</th><th>Calibre</th><th>Propietario</th><th>Estado LOC</th></tr></thead><tbody>{revision.armas.slice(0, 20).map((a, i) => <tr key={i}><td>{a.matricula}</td><td>{a.tipo}</td><td>{a.marca}</td><td>{a.modelo}</td><td>{a.calibre}</td><td>{a.propietario || "—"}</td><td>{a.estadoLoc || "—"}</td></tr>)}</tbody></table>
        {revision.armas.length > 20 && <p className="p-2 text-xs text-muted-foreground">Vista previa de las primeras 20 armas; se importarán todas.</p>}
      </div>}
      <label className="my-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={ficticio} onChange={(e) => setFicticio(e.target.checked)} />Confirmo que el archivo contiene exclusivamente datos ficticios.</label>
      <Button disabled={busy || errores.length > 0 || !ficticio || !ref.trim() || (modo !== "actualizacion" && !agr)} onClick={() => {
        if (run(() => importarArmas(s, userId, revision.armas, modo, dep, agr, ref), modo === "actualizacion" ? "Datos LOC 44 actualizados; auditoría registrada." : "Lote registrado con folio pendiente de autorización.")) onClose();
      }}><Check />Confirmar {modo === "actualizacion" ? "actualización" : "importación"}</Button>
    </div>}
    {!revision && !busy && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Upload className="h-4 w-4" />Clase, marca, modelo, calibre y matrícula obligatorios; admite más de 1,000 armas por archivo.</p>}
  </section>;
}