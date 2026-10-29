import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useUsuario } from "@/components/sica/Shell";
import { Field, PageHeader, fmt, run } from "@/components/sica/ui";
import { capturarFolio, puede, type NuevoFolio } from "@/lib/sica/engine";
import { useDerivado } from "@/lib/sica/hooks";
import { TIPO_FOLIO_LABEL, type Partida, type TipoFolio } from "@/lib/sica/types";

export const Route = createFileRoute("/folios/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo folio — SICA" },
      { name: "description", content: "Captura de folio documental de movimiento." },
      { property: "og:title", content: "Nuevo folio — SICA" },
      { property: "og:description", content: "Captura de folio documental de movimiento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NuevoFolioPage,
});

const TIPOS: TipoFolio[] = ["introduccion", "extraccion", "transferencia", "ext_personal", "dev_personal", "ajuste"];
const usaOrigen = (t: TipoFolio) => t !== "introduccion" && t !== "inicial";
const usaDestinoAgr = (t: TipoFolio) => t === "introduccion" || t === "transferencia";
const usaPersona = (t: TipoFolio) => t === "ext_personal" || t === "dev_personal";

function NuevoFolioPage() {
  const user = useUsuario()!;
  const nav = useNavigate();
  const { s, armas, consumibles, n } = useDerivado();
  const [tipo, setTipo] = useState<TipoFolio>("transferencia");
  const [dO, setDO] = useState("");
  const [aO, setAO] = useState(user.agrupamientoId ?? "");
  const [dD, setDD] = useState("");
  const [aD, setAD] = useState("");
  const [per, setPer] = useState("");
  const [entrega, setEntrega] = useState("");
  const [recibe, setRecibe] = useState("");
  const [obs, setObs] = useState("");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [item, setItem] = useState("");
  const [cant, setCant] = useState(1);
  const [busy, setBusy] = useState(false);

  // Armas elegibles según ubicación de origen derivada
  const elegibles = useMemo(() => {
    if (tipo === "introduccion") return armas.filter((a) => !a.pos);
    return armas.filter(
      (a) => a.pos && a.pos.dep === dO && a.pos.agr === aO && (tipo === "dev_personal" ? a.pos.per === per : !a.pos.per),
    );
  }, [armas, tipo, dO, aO, per]);
  const disponible = (cid: string) => {
    const c = consumibles.find((x) => x.id === cid);
    return c?.pos.filter((p) => p.dep === dO && p.agr === aO && p.per === (tipo === "dev_personal" ? per : "")).reduce((t, p) => t + p.qty, 0) ?? 0;
  };

  if (!puede(user.rol, "capturar")) return <p className="text-sm text-muted-foreground">Su rol no permite capturar folios.</p>;

  const agregar = () => {
    if (!item) return;
    const [t, id] = item.split(":");
    if (t === "A") { if (!partidas.some((p) => p.armaId === id)) setPartidas([...partidas, { armaId: id, cantidad: 1 }]); }
    else if (cant !== 0) setPartidas([...partidas, { itemId: id, cantidad: cant }]);
    setItem("");
  };
  const desc = (p: Partida) => p.armaId ? `${s.armas.find((a) => a.id === p.armaId)?.tipo} ${s.armas.find((a) => a.id === p.armaId)?.matricula}` : s.consumibles.find((c) => c.id === p.itemId)?.descripcion;

  const submit = () => {
    if (busy) return; // protección contra doble envío
    setBusy(true);
    const data: NuevoFolio = {
      tipo,
      depositoOrigenId: usaOrigen(tipo) ? dO : undefined,
      agrupOrigenId: usaOrigen(tipo) ? aO : undefined,
      depositoDestinoId: tipo === "introduccion" || (tipo === "transferencia" && dD && dD !== dO) ? dD : undefined,
      agrupDestinoId: usaDestinoAgr(tipo) ? aD : undefined,
      personaId: usaPersona(tipo) ? per : undefined,
      entrega, recibe, obs, partidas,
      fisicoConfirmado: tipo === "transferencia" && dD && dD !== dO ? false : undefined,
    };
    let id = "";
    const ok = run(() => { const r = capturarFolio(s, user.id, data); id = r.folio.id; return r.state; }, "Folio capturado (pendiente de autorización)");
    setBusy(false);
    if (ok) nav({ to: "/folios/$id", params: { id } });
  };

  const sel = (v: string, set: (x: string) => void, list: { id: string; nombre: string }[]) => (
    <select className="field" value={v} onChange={(e) => { set(e.target.value); setPartidas([]); }}>
      <option value="">Seleccione…</option>
      {list.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
    </select>
  );

  return (
    <div className="max-w-5xl">
      <PageHeader title="Nuevo folio" desc="El número consecutivo se asigna al guardar. Las existencias no cambian hasta la autorización." actions={<Link to="/folios" className="btn">Volver</Link>} />
      <div className="card space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tipo de movimiento">
            <select className="field" value={tipo} onChange={(e) => { setTipo(e.target.value as TipoFolio); setPartidas([]); }}>
              {TIPOS.map((t) => <option key={t} value={t}>{TIPO_FOLIO_LABEL[t]}</option>)}
            </select>
          </Field>
        </div>
        {tipo === "transferencia" && (
          <p className="rounded bg-info-soft p-3 text-xs text-primary">
            Cambio de adscripción administrativa. Si no indica depósito destino distinto, la custodia física no cambia. Si lo indica, el traslado físico queda pendiente de confirmación.
          </p>
        )}
        {tipo === "ajuste" && <p className="rounded bg-warning-soft p-3 text-xs text-warning">Ajuste autorizado: use cantidades negativas para faltantes y positivas para sobrantes. Requiere justificación en observaciones.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {usaOrigen(tipo) && <>
            <Field label="Depósito origen">{sel(dO, setDO, s.depositos)}</Field>
            <Field label="Agrupamiento origen">{sel(aO, setAO, s.agrupamientos)}</Field>
          </>}
          {(tipo === "introduccion" || tipo === "transferencia") && (
            <Field label={tipo === "transferencia" ? "Depósito destino (opcional, traslado físico)" : "Depósito destino"}>{sel(dD, setDD, s.depositos)}</Field>
          )}
          {usaDestinoAgr(tipo) && <Field label="Agrupamiento destino">{sel(aD, setAD, s.agrupamientos)}</Field>}
          {usaPersona(tipo) && <Field label="Persona responsable">{sel(per, setPer, s.personas.map((p) => ({ id: p.id, nombre: `${p.nombre} (${p.idInst})` })))}</Field>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Responsable que entrega"><input className="field" value={entrega} onChange={(e) => setEntrega(e.target.value)} /></Field>
          <Field label="Responsable que recibe"><input className="field" value={recibe} onChange={(e) => setRecibe(e.target.value)} /></Field>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold">Bienes y cantidades</div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-80 flex-1">
              <select className="field" value={item} onChange={(e) => setItem(e.target.value)}>
                <option value="">Seleccione bien…</option>
                <optgroup label={`Armas elegibles (${elegibles.length})`}>
                  {elegibles.map((a) => <option key={a.id} value={`A:${a.id}`}>{a.matricula} · {a.tipo} {a.modelo} {a.calibre}</option>)}
                </optgroup>
                <optgroup label="Cargadores, cartuchos y granadas">
                  {s.consumibles.map((c) => <option key={c.id} value={`C:${c.id}`}>{c.descripcion}{usaOrigen(tipo) ? ` — disp. ${fmt(disponible(c.id))}` : ""}</option>)}
                </optgroup>
              </select>
            </div>
            {item.startsWith("C:") && <input type="number" className="field w-28" value={cant} onChange={(e) => setCant(Number(e.target.value))} />}
            <button type="button" className="btn" onClick={agregar}>Agregar partida</button>
          </div>
          {usaOrigen(tipo) && (!dO || !aO) && <p className="mt-2 text-xs text-muted-foreground">Seleccione depósito y agrupamiento de origen para ver armas elegibles.</p>}
          <table className="data-table mt-3">
            <thead><tr><th>#</th><th>Bien</th><th>Cantidad</th><th /></tr></thead>
            <tbody>
              {partidas.map((p, i) => (
                <tr key={i}><td>{i + 1}</td><td>{desc(p)}</td><td className="font-mono">{fmt(p.cantidad)}</td>
                  <td><button className="text-xs text-destructive underline" onClick={() => setPartidas(partidas.filter((_, j) => j !== i))}>Quitar</button></td></tr>
              ))}
              {!partidas.length && <tr><td colSpan={4} className="text-muted-foreground">Sin partidas.</td></tr>}
            </tbody>
          </table>
        </div>
        <Field label="Observaciones"><textarea className="field h-20 py-2" value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
        <div className="flex gap-2 border-t pt-4">
          <button className="btn btn-primary" disabled={busy || !partidas.length} onClick={submit}>Guardar folio</button>
          <span className="self-center text-xs text-muted-foreground">Captura: {user.nombre} · fecha y hora automáticas · origen sugerido {n.agr(aO)}</span>
        </div>
      </div>
    </div>
  );
}
