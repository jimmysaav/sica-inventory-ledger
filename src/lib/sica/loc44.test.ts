import { describe, expect, it } from "vitest";
import { autorizarFolio, calcularSaldos, importarArmas, posicionArma, type ArmaImportada } from "./engine";
import { CAMPOS_LOC, revisarFilasLoc } from "./loc44";
import { crearSeed } from "./seed";

const arma = (i: number): ArmaImportada => ({ tipo: "Pistola", marca: "Marca ficticia", modelo: "Modelo ficticio", calibre: "9 mm", matricula: `LOCFICT-${i}`, conservacion: "bueno", mantenimiento: false, refDoc: "DOC-FICT", funcionamiento: "SEMI-AUTOMATICO", manifestacionC: "C-FICT", manifestacionD: "D-FICT", propietario: "Estado", estadoLoc: "asegurada", informacion: "Carpeta ficticia" });

describe("LOC 44", () => {
  it("solo el Jefe del Depósito General importa Excel, no admin, operadores o consulta", () => {
    for (const id of ["u-admin", "u-oper", "u-cons", "u-depo", "u-aud"]) expect(() => importarArmas(crearSeed(), id, [arma(1)], "inicial", "dep-gral", "ag-hal", "FICTICIO")).toThrow(/permiso/);
    expect(importarArmas(crearSeed(), "u-jefe", [arma(1)], "inicial", "dep-gral", "ag-hal", "FICTICIO").armas).toHaveLength(31);
  });
  it("admite más de mil armas en un único lote sin crear saldos antes de autorizar", () => {
    const s = importarArmas(crearSeed(), "u-jefe", Array.from({ length: 1001 }, (_, i) => arma(i)), "inicial", "dep-desspeja", "ag-hal", "LOTE FICTICIO 1001");
    expect(s.armas).toHaveLength(1031);
    const f = s.folios.at(-1);
    if (!f) throw new Error("Falta folio");
    expect(f.partidas).toHaveLength(1001);
    expect(f.estado).toBe("pendiente");
    const id = f.partidas[0]?.armaId;
    if (!id) throw new Error("Falta arma");
    expect(posicionArma(calcularSaldos(s.folios), id)).toBeNull();
    const aplicado = autorizarFolio(s, "u-jefe", f.id);
    expect(posicionArma(calcularSaldos(aplicado.folios), id)).toEqual({ dep: "dep-desspeja", agr: "ag-hal", per: "", qty: 1 });
  });
  it("rechaza duplicados sin modificar el estado original", () => {
    const s = crearSeed();
    expect(() => importarArmas(s, "u-jefe", [arma(1), arma(1)], "introduccion", "dep-gral", "ag-hal", "FICTICIO")).toThrow(/repetida/);
    expect(s.armas).toHaveLength(30);
    const a = s.armas[0];
    if (!a) throw new Error("Sin arma");
    expect(() => importarArmas(s, "u-jefe", [a], "introduccion", "dep-gral", "ag-hal", "FICTICIO")).toThrow(/ya está/);
  });
  it("actualiza manifestaciones y propietario conservando adscripción, custodia, mantenimiento y auditoría con usuario y hora", () => {
    const s = crearSeed();
    const a = s.armas[0];
    if (!a) throw new Error("Sin arma");
    const next = importarArmas(s, "u-jefe", [{ ...a, manifestacionC: "C-NUEVO-FICT", manifestacionD: "D-NUEVO-FICT", propietario: "Defensa", estadoLoc: "extraviada", mantenimiento: !a.mantenimiento }], "actualizacion", "", "", "ACTUALIZACION FICTICIA");
    expect(next.armas[0]?.manifestacionC).toBe("C-NUEVO-FICT");
    expect(next.armas[0]?.manifestacionD).toBe("D-NUEVO-FICT");
    expect(next.armas[0]?.propietario).toBe("Defensa");
    expect(next.armas[0]?.estadoLoc).toBe("extraviada");
    expect(next.armas[0]?.mantenimiento).toBe(a.mantenimiento);
    expect(calcularSaldos(next.folios)).toEqual(calcularSaldos(s.folios));
    expect(next.auditoria[0]?.userId).toBe("u-jefe");
    expect(Number.isFinite(Date.parse(next.auditoria[0]?.fecha ?? ""))).toBe(true);
    const audit = JSON.parse(next.auditoria[0]?.detalle ?? "{}");
    expect(audit.antes).toEqual(a);
    expect(audit.despues.manifestacionC).toBe("C-NUEVO-FICT");
  });
  it("lee las columnas LOC44 y señala errores de matrícula y propietario", () => {
    const cab = CAMPOS_LOC.map(([, l]) => l);
    const a = arma(1);
    const row = CAMPOS_LOC.map(([k]) => String(a[k] ?? ""));
    const revision = revisarFilasLoc([cab, row]);
    expect(revision.errores).toHaveLength(0);
    expect(revision.armas[0]?.manifestacionD).toBe("D-FICT");
    expect(revision.armas[0]?.informacion).toBe("Carpeta ficticia");
    expect(revisarFilasLoc([cab, row, row]).errores.some((e) => e.fila === 3 && e.mensaje.includes("duplicada"))).toBe(true);
    const invalid = [...row];
    invalid[8] = "Otro";
    expect(revisarFilasLoc([cab, invalid]).errores.some((e) => e.mensaje.includes("Propietario"))).toBe(true);
  });
  it("configura ambos depósitos generales", () => {
    const generales = crearSeed().depositos.filter((d) => d.tipo === "general").map((d) => d.nombre);
    expect(generales).toEqual(["Depósito General", "Depósito DESSPEJA"]);
  });
});