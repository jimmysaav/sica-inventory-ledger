import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUsuario } from "@/components/sica/Shell";
import { Badge, Empty, Field, PageHeader, fmt, run } from "@/components/sica/ui";
import { puede, registrarArma } from "@/lib/sica/engine";
import { SITUACION_LABEL, useDerivado } from "@/lib/sica/hooks";
import { CATEGORIA_LABEL, type Categoria } from "@/lib/sica/types";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario maestro — SICA" },
      { name: "description", content: "Catálogo institucional de armas, cargadores, cartuchos y granadas." },
      { property: "og:title", content: "Inventario maestro — SICA" },
      { property: "og:description", content: "Catálogo institucional de armas, cargadores, cartuchos y granadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inventario,
});

const SIT_TONE = { disponible: "ok", resguardo_personal: "info", mantenimiento: "warn", fuera_inventario: "neutral" } as const;

function Inventario() {
  const user = useUsuario()!;
  const { s, armas, consumibles, n } = useDerivado();
  const [tab, setTab] = useState<"arma" | Categoria>("arma");
  const [q, setQ] = useState("");
  const [alta, setAlta] = useState(false);
  const ql = q.toLowerCase();
  // Depositario: solo datos de su agrupamiento
  const scope = user.rol === "depositario" ? user.agrupamientoId : undefined;
  const lista = armas.filter(
    (a) =>
      (!scope || a.pos?.agr === scope) &&
      [a.matricula, a.tipo, a.marca, a.modelo, a.calibre, n.agr(a.pos?.agr), n.dep(a.pos?.dep)].join(" ").toLowerCase().includes(ql),
  );

  return (
    <div>
      <PageHeader
        title="Inventario maestro"
        desc={scope ? `Vista limitada a ${n.agr(scope)} (rol depositario).` : "Un solo inventario institucional. Adscripción, custodia y resguardo se derivan de los folios."}
        actions={tab === "arma" && puede(user.rol, "registrarArma") && <button className="btn btn-primary" onClick={() => setAlta(!alta)}>Alta en catálogo</button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["arma", "cargador", "cartucho", "granada"] as const).map((t) => (
          <button key={t} className={`btn ${tab === t ? "btn-primary" : ""}`} onClick={() => setTab(t)}>
            {t === "arma" ? "Armas" : CATEGORIA_LABEL[t]}
          </button>
        ))}
        {tab === "arma" && <input className="field ml-auto max-w-xs" placeholder="Buscar matrícula, tipo, agrupamiento…" value={q} onChange={(e) => setQ(e.target.value)} />}
      </div>
      {alta && tab === "arma" && <AltaArma onDone={() => setAlta(false)} userId={user.id} />}

      {tab === "arma" ? (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Prog.</th><th>Matrícula</th><th>Tipo</th><th>Marca / modelo</th><th>Calibre</th><th>Situación</th>
                <th>Adscripción</th><th>Custodio (físico)</th><th>Resguardo personal</th><th>Conserv.</th><th>Ref. doc.</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono">{a.progresivo}</td>
                  <td className="font-mono font-medium">{a.matricula}</td>
                  <td>{a.tipo}</td>
                  <td>{a.marca} {a.modelo}</td>
                  <td>{a.calibre}</td>
                  <td><Badge tone={SIT_TONE[a.situacion]}>{SITUACION_LABEL[a.situacion]}</Badge></td>
                  <td>{n.agr(a.pos?.agr)}</td>
                  <td>{n.dep(a.pos?.dep)}</td>
                  <td>{a.pos?.per ? n.per(a.pos.per) : "—"}</td>
                  <td className="capitalize">{a.conservacion}</td>
                  <td className="font-mono text-xs">{a.refDoc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!lista.length && <Empty>Sin resultados.</Empty>}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Descripción</th><th>Calibre</th><th>Detalle</th><th>Existencia total</th><th>Distribución (depósito / agrupamiento / resguardo)</th></tr>
            </thead>
            <tbody>
              {consumibles.filter((c) => c.categoria === tab).map((c) => {
                const pos = c.pos.filter((p) => !scope || p.agr === scope);
                return (
                  <tr key={c.id}>
                    <td className="font-medium">{c.descripcion}</td>
                    <td>{c.calibre}</td>
                    <td className="text-muted-foreground">{c.detalle}</td>
                    <td className="font-mono font-semibold">{fmt(pos.reduce((t, p) => t + p.qty, 0))}</td>
                    <td className="text-xs">
                      {pos.map((p, i) => (
                        <div key={i}>{n.dep(p.dep)} / {n.agr(p.agr)}{p.per ? ` / ${n.per(p.per)}` : ""}: <b className="font-mono">{fmt(p.qty)}</b></div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t p-3 text-xs text-muted-foreground">Alta de nuevos tipos de cargador, cartucho o granada: pendiente. {s.consumibles.length} tipos en catálogo.</p>
        </div>
      )}
    </div>
  );
}

function AltaArma({ onDone, userId }: { onDone: () => void; userId: string }) {
  const { s } = useDerivado();
  const [f, setF] = useState({ tipo: "Pistola", marca: "", modelo: "", calibre: "9 mm", matricula: "", conservacion: "bueno" as const, refDoc: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="card mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (run(() => registrarArma(s, userId, { ...f, mantenimiento: false }), "Arma registrada en catálogo. Capture un folio de introducción para darle existencia.")) onDone();
      }}
    >
      <Field label="Tipo"><input className="field" value={f.tipo} onChange={set("tipo")} required /></Field>
      <Field label="Marca"><input className="field" value={f.marca} onChange={set("marca")} required /></Field>
      <Field label="Modelo"><input className="field" value={f.modelo} onChange={set("modelo")} required /></Field>
      <Field label="Calibre"><input className="field" value={f.calibre} onChange={set("calibre")} required /></Field>
      <Field label="Matrícula (única)"><input className="field font-mono" value={f.matricula} onChange={set("matricula")} required /></Field>
      <Field label="Referencia documental"><input className="field" value={f.refDoc} onChange={set("refDoc")} /></Field>
      <div className="flex gap-2 sm:col-span-3 lg:col-span-6">
        <button className="btn btn-primary">Registrar</button>
        <button type="button" className="btn" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}
