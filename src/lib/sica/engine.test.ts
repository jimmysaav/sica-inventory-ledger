import { describe, expect, it } from "vitest";
import { autorizarFolio, calcularSaldos, capturarFolio, posicionArma, registrarArma, resolverCancelacion, revertirFolio, solicitarCancelacion } from "./engine";
import { crearSeed } from "./seed";

describe("SICA reglas", () => {
  it("solo el jefe del Depósito General puede resolver cancelaciones", () => {
    const s = crearSeed();
    const f = s.folios.find((x) => x.cancelacion)!;
    expect(() => resolverCancelacion(s, "u-admin", f.id, true, "")).toThrow();
    expect(resolverCancelacion(s, "u-jefe", f.id, true, "").folios.find((x) => x.id === f.id)!.estado).toBe("cancelado");
  });

  it("un folio aplicado no se cancela; se revierte", () => {
    const s = crearSeed();
    const f = s.folios.find((x) => x.estado === "aplicado" && x.tipo === "ext_personal")!;
    expect(() => solicitarCancelacion(s, "u-oper", f.id, "Motivo suficientemente largo")).toThrow();
    const r = revertirFolio(s, "u-jefe", f.id, "Error en el responsable asignado");
    expect(posicionArma(calcularSaldos(r.folios), "a5")!.per).toBe("");
  });

  it("transferencia administrativa cambia adscripción y no la custodia física", () => {
    let s = crearSeed();
    const t = s.folios.find((x) => x.tipo === "transferencia")!;
    s = autorizarFolio(s, "u-jefe", t.id);
    const p = posicionArma(calcularSaldos(s.folios), "a3")!;
    expect(p.agr).toBe("ag-eriv");
    expect(p.dep).toBe("dep-drag");
  });

  it("rechaza matrícula duplicada", () => {
    const s = crearSeed();
    expect(() => registrarArma(s, "u-oper", { ...s.armas[0], matricula: s.armas[0].matricula.toLowerCase() })).toThrow(/ya está registrada/);
  });

  it("no permite extraer más existencia de la disponible", () => {
    const s = crearSeed();
    expect(() =>
      capturarFolio(s, "u-oper", { tipo: "extraccion", depositoOrigenId: "dep-gral", agrupOrigenId: "ag-hal", entrega: "", recibe: "", obs: "", partidas: [{ itemId: "c6", cantidad: 9999 }] }),
    ).toThrow(/insuficiente/);
  });

  it("los folios pendientes no afectan existencias", () => {
    const s = crearSeed();
    const { state } = capturarFolio(s, "u-oper", { tipo: "extraccion", depositoOrigenId: "dep-gral", agrupOrigenId: "ag-hal", entrega: "", recibe: "", obs: "", partidas: [{ itemId: "c6", cantidad: 1 }] });
    expect(calcularSaldos(state.folios).get("C:c6|dep-gral|ag-hal|")).toBe(calcularSaldos(s.folios).get("C:c6|dep-gral|ag-hal|"));
  });
});
