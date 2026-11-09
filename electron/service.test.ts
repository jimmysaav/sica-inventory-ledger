// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { LocalService, initSQL } from "./service";
import { calcularSaldos, custodioEquipo, posicionArma } from "../src/lib/sica/engine";

const pw = "Clave-ficticia-1234";
let SQL: Awaited<ReturnType<typeof initSQL>>;
beforeAll(async()=>{ SQL=await initSQL(path.resolve("electron/dist/main")); });
function fixture() {
  const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"sica-test-")),"local.sica");
  const key=randomBytes(32);
  const crypt={encrypt:(plain:Buffer)=>{const iv=randomBytes(12),c=createCipheriv("aes-256-gcm",key,iv);return Buffer.concat([iv,c.update(plain),c.final(),c.getAuthTag()]);},decrypt:(bytes:Buffer)=>{const c=createDecipheriv("aes-256-gcm",key,bytes.subarray(0,12));c.setAuthTag(bytes.subarray(-16));return Buffer.concat([c.update(bytes.subarray(12,-16)),c.final()]);}};
  const service=new LocalService(file,crypt,SQL);service.open();
  service.setup({nombre:"Jefe ficticio",usuario:"jefe",password:pw,deposito:"Depósito ficticio",agrupamiento:"Agrupamiento ficticio"});
  return {service,file,crypt};
}
describe("Windows offline local service",()=>{
  it("encrypts storage, persists over restart, requires individual sign in and denies forged roles",()=>{
    const {service,file,crypt}=fixture();
    service.command({type:"usuario",nombre:"Consulta ficticia",usuario:"consulta",password:pw,rol:"consulta"});
    expect(fs.readFileSync(file).includes(Buffer.from("Jefe ficticio"))).toBe(false);
    const next=new LocalService(file,crypt,SQL); expect(next.open()).toEqual({configured:true});
    expect(()=>next.read()).toThrow(/sesión/);
    next.login({usuario:"consulta",password:pw});
    expect(()=>next.command({type:"equipo",descripcion:"Radio ficticio",serie:"FICT-R1"})).toThrow(/permiso/);
    expect(()=>next.command({type:"usuario",nombre:"Ataque ficticio",usuario:"nuevo",password:pw,rol:"jefe"})).toThrow(/exclusiva/);
    expect(()=>next.command({type:"equipo",descripcion:"Radio",serie:"R2",userId:service.read().user.id})).toThrow();
  });
  it("issues and returns weapons and equipment only after element authentication; prevents negative balances and double issue",()=>{
    const {service}=fixture();let view=service.read();
    view=service.command({type:"persona",persona:{nombre:"Elemento ficticio",idInst:"FICT-01",area:"Prueba",usuario:"elemento",telefono:"",nombramiento:"Ficticio",agrupamientoId:view.config.agrupamientoId}});
    const p=view.state.personas[0];if(!p)throw Error();
    service.command({type:"passwordElemento",personaId:p.id,password:pw});
    view=service.command({type:"equipo",descripcion:"Radio ficticio",serie:"R-FICT-1"});
    view=service.command({type:"importar",modo:"inicial",referencia:"FICTICIO",armas:[{tipo:"Pistola",marca:"Ficticia",modelo:"Ficticio",calibre:"9 mm",matricula:"FICT-ARMA-1",conservacion:"bueno",mantenimiento:false,refDoc:"FICTICIO"}]});
    const f=view.state.folios.at(-1);const a=view.state.armas[0];const e=view.state.equipo?.[0];if(!f||!a||!e)throw Error();
    expect(posicionArma(calcularSaldos(view.state.folios),a.id)).toBeNull();
    view=service.command({type:"autorizar",id:f.id});
    const issue={type:"servicio" as const,personaId:p.id,devolver:false,partidas:[{armaId:a.id,cantidad:1}],equipoIds:[e.id],motivo:"Servicio ficticio",passwordElemento:pw};
    expect(()=>service.command({...issue,passwordElemento:"incorrecta"})).toThrow(/Credenciales/);
    expect(custodioEquipo(service.read().state,e.id)).toBeNull();
    view=service.command(issue);
    expect(posicionArma(calcularSaldos(view.state.folios),a.id)?.per).toBe(p.id);
    expect(custodioEquipo(view.state,e.id)).toBe(p.id);
    expect(()=>service.command(issue)).toThrow(/disponible/);
    expect(()=>service.command({...issue,equipoIds:[]})).toThrow(/insuficiente/);
    view=service.command({...issue,devolver:true});
    expect(posicionArma(calcularSaldos(view.state.folios),a.id)?.per).toBe("");
    expect(custodioEquipo(view.state,e.id)).toBeNull();
    expect(view.state.auditoria[0]?.accion).toBe("SERVICIO_DEVOLUCION");
  });
  it("restores authenticated encrypted backups and rejects wrong passwords or corruption without data loss",()=>{
    const {service}=fixture(); const backup=service.backup(pw);
    service.command({type:"equipo",descripcion:"Chaleco ficticio",serie:"FICT-C1"});
    expect(()=>service.restore(backup,"Incorrecta-123456")).toThrow(/inválido/);
    expect(service.read().state.equipo).toHaveLength(1);
    const changed=Buffer.from(backup);changed[changed.length-10]^=1;
    expect(()=>service.restore(changed,pw)).toThrow();
    service.restore(backup,pw);expect(()=>service.read()).toThrow(/sesión/);
    expect(service.login({usuario:"jefe",password:pw}).state.equipo).toHaveLength(0);
  });
  it("locks an account after five failed attempts and keeps the lock after restart",()=>{
    const {service,file,crypt}=fixture();service.logout();
    for(let i=0;i<5;i++)expect(()=>service.login({usuario:"jefe",password:"incorrecta"})).toThrow(/Credenciales/);
    const reopened=new LocalService(file,crypt,SQL);reopened.open();
    expect(()=>reopened.login({usuario:"jefe",password:pw})).toThrow(/bloqueado/);
  });
});