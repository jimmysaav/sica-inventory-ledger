import { useState } from "react";
import { useUsuario } from "./Shell";
import { Field, PageHeader, fmt, run } from "./ui";
import { altaCatalogo, puede } from "@/lib/sica/engine";
import { useDerivado } from "@/lib/sica/hooks";
import type { Categoria } from "@/lib/sica/types";

/**
 * Vista de catálogo. "deposito" agrupa existencias por custodia física;
 * "agrupamiento" por adscripción administrativa. Mismos saldos, sin duplicar.
 */
export function Catalogo({ tipo }: { tipo: "deposito" | "agrupamiento" }) {
  const user = useUsuario()!;
  const { s, armas, consumibles, n } = useDerivado();
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const lista = tipo === "deposito" ? s.depositos : s.agrupamientos;
  const otro = tipo === "deposito" ? s.agrupamientos : s.depositos;
  const k = tipo === "deposito" ? "dep" : "agr";
  const ko = tipo === "deposito" ? "agr" : "dep";
  const sum = (c: Categoria, id: string, oid?: string) =>
    consumibles.filter((x) => x.categoria === c).reduce((t, x) => t + x.pos.filter((p) => p[k] === id && (!oid || p[ko] === oid)).reduce((u, p) => u + p.qty, 0), 0);

  return (
    <div>
      <PageHeader
        title={tipo === "deposito" ? "Depósitos (custodia física)" : "Agrupamientos (adscripción administrativa)"}
        desc={tipo === "deposito" ? "Existencias físicas por instalación, desglosadas por agrupamiento de adscripción." : "Estado de fuerza administrativo por agrupamiento, desglosado por depósito custodio."}
      />
      {puede(user.rol, "catalogos") && (
        <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" onSubmit={(e) => {
          e.preventDefault();
          if (run(() => altaCatalogo(s, user.id, tipo, clave, nombre), "Registro agregado")) { setClave(""); setNombre(""); }
        }}>
          <div className="w-28"><Field label="Clave"><input className="field" value={clave} onChange={(e) => setClave(e.target.value)} /></Field></div>
          <div className="w-72"><Field label="Nombre"><input className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field></div>
          <button className="btn btn-primary">Agregar {tipo === "deposito" ? "depósito" : "agrupamiento"}</button>
        </form>
      )}
      <div className="space-y-4">
        {lista.map((d) => {
          const arms = armas.filter((a) => a.pos?.[k] === d.id);
          const rel = otro.filter((o) => arms.some((a) => a.pos?.[ko] === o.id) || sum("cartucho", d.id, o.id) > 0 || sum("cargador", d.id, o.id) > 0);
          return (
            <div key={d.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div><span className="mr-2 font-mono text-xs text-muted-foreground">{d.clave}</span><span className="font-semibold">{d.nombre}</span></div>
                <div className="flex gap-5 text-xs text-muted-foreground">
                  <span>Armas <b className="font-mono text-foreground">{arms.length}</b></span>
                  <span>Cargadores <b className="font-mono text-foreground">{fmt(sum("cargador", d.id))}</b></span>
                  <span>Cartuchos <b className="font-mono text-foreground">{fmt(sum("cartucho", d.id))}</b></span>
                  <span>Granadas <b className="font-mono text-foreground">{fmt(sum("granada", d.id))}</b></span>
                </div>
              </div>
              <table className="data-table">
                <thead><tr><th>{tipo === "deposito" ? "Agrupamiento de adscripción" : "Depósito custodio"}</th><th>Armas</th><th>En resguardo personal</th><th>Cargadores</th><th>Cartuchos</th><th>Granadas</th></tr></thead>
                <tbody>
                  {rel.map((o) => {
                    const ao = arms.filter((a) => a.pos?.[ko] === o.id);
                    return (
                      <tr key={o.id}>
                        <td>{tipo === "deposito" ? n.agr(o.id) : n.dep(o.id)}</td>
                        <td className="font-mono">{ao.length}</td>
                        <td className="font-mono">{ao.filter((a) => a.pos?.per).length}</td>
                        <td className="font-mono">{fmt(sum("cargador", d.id, o.id))}</td>
                        <td className="font-mono">{fmt(sum("cartucho", d.id, o.id))}</td>
                        <td className="font-mono">{fmt(sum("granada", d.id, o.id))}</td>
                      </tr>
                    );
                  })}
                  {!rel.length && <tr><td colSpan={6} className="text-muted-foreground">Sin existencias.</td></tr>}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
