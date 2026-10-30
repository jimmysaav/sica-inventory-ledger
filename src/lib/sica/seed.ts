import type { Arma, Consumible, Folio, SicaState } from "./types";

/** DATOS COMPLETAMENTE FICTICIOS — prototipo de demostración. */
export function crearSeed(): SicaState {
  const t0 = "2026-01-05T09:00:00.000Z";
  const depositos = [
    { id: "dep-gral", clave: "DG", nombre: "Depósito General", tipo: "general" as const },
    { id: "dep-drag", clave: "DD", nombre: "Depósito Dragones", tipo: "regional" as const },
    { id: "dep-nte", clave: "DN", nombre: "Depósito Zona Norte", tipo: "regional" as const },
  ];
  const agrupamientos = [
    { id: "ag-drag", clave: "AGD", nombre: "Agrupamiento Dragones" },
    { id: "ag-jag", clave: "EJA", nombre: "Escuadrón Jaguares" },
    { id: "ag-eriv", clave: "ERIV", nombre: "Escuadrón ERIV" },
    { id: "ag-spe", clave: "SPE", nombre: "Servicio de Protección Estatal" },
    { id: "ag-hal", clave: "AHA", nombre: "Agrupamiento Halcones" },
  ];
  const usuarios = [
    { id: "u-admin", nombre: "Lic. Ana Torres (ficticio)", usuario: "admin", rol: "admin" as const },
    { id: "u-jefe", nombre: "Cmdte. Raúl Méndez (ficticio)", usuario: "jefe", rol: "jefe" as const },
    { id: "u-oper", nombre: "Ofl. Sofía Ruiz (ficticio)", usuario: "operador", rol: "operador" as const },
    {
      id: "u-depo",
      nombre: "Sgto. Luis Pérez (ficticio)",
      usuario: "depositario",
      rol: "depositario" as const,
      agrupamientoId: "ag-drag",
    },
    { id: "u-cons", nombre: "Lic. Marta Gil (ficticio)", usuario: "consulta", rol: "consulta" as const },
    { id: "u-aud", nombre: "C.P. Jorge León (ficticio)", usuario: "auditor", rol: "auditor" as const },
  ];
  const personas = [
    { id: "p1", nombre: "Elemento Juan Ficticio Uno", idInst: "ID-00101", area: "Operativa", agrupamientoId: "ag-drag" },
    { id: "p2", nombre: "Elemento María Ficticia Dos", idInst: "ID-00102", area: "Escolta", agrupamientoId: "ag-spe" },
    { id: "p3", nombre: "Elemento Pedro Ficticio Tres", idInst: "ID-00103", area: "Escolta", agrupamientoId: "ag-spe" },
    { id: "p4", nombre: "Elemento Laura Ficticia Cuatro", idInst: "ID-00104", area: "Operativa", agrupamientoId: "ag-jag" },
  ];
  const modelos = [
    { tipo: "Pistola", marca: "Marca A", modelo: "P-100", calibre: "9 mm" },
    { tipo: "Fusil", marca: "Marca B", modelo: "F-556", calibre: "5.56 mm" },
    { tipo: "Carabina", marca: "Marca C", modelo: "C-9", calibre: "9 mm" },
    { tipo: "Escopeta", marca: "Marca D", modelo: "E-12", calibre: "12 GA" },
  ];
  const armas: Arma[] = Array.from({ length: 30 }, (_, i) => {
    const m = modelos[i % modelos.length]!;
    return {
      id: `a${i + 1}`,
      progresivo: i + 1,
      ...m,
      matricula: `FX-${String(10000 + i * 37).padStart(5, "0")}`,
      conservacion: i % 9 === 0 ? "regular" : "bueno",
      mantenimiento: i % 11 === 5,
      refDoc: `REF-FICT-${String(i + 1).padStart(3, "0")}`,
    };
  });
  const consumibles: Consumible[] = [
    { id: "c1", categoria: "cargador", descripcion: "Cargador pistola P-100", calibre: "9 mm", detalle: "Compat. P-100 · cap. 15" },
    { id: "c2", categoria: "cargador", descripcion: "Cargador fusil F-556", calibre: "5.56 mm", detalle: "Compat. F-556 · cap. 30" },
    { id: "c3", categoria: "cartucho", descripcion: "Cartucho 9 mm", calibre: "9 mm", detalle: "Lote L-FICT-01" },
    { id: "c4", categoria: "cartucho", descripcion: "Cartucho 5.56 mm", calibre: "5.56 mm", detalle: "Lote L-FICT-02" },
    { id: "c5", categoria: "cartucho", descripcion: "Cartucho 12 GA", calibre: "12 GA", detalle: "Sin lote" },
    { id: "c6", categoria: "granada", descripcion: "Granada de humo", calibre: "37 mm", detalle: "Tipo humo" },
    { id: "c7", categoria: "granada", descripcion: "Granada aturdidora", calibre: "40 mm", detalle: "Tipo aturdidora" },
  ];

  const ubic = [
    { d: "dep-gral", a: "ag-hal" },
    { d: "dep-drag", a: "ag-drag" },
    { d: "dep-drag", a: "ag-jag" },
    { d: "dep-drag", a: "ag-eriv" },
    { d: "dep-nte", a: "ag-spe" },
    { d: "dep-gral", a: "ag-spe" },
  ];
  const folios: Folio[] = [];
  let n = 1;
  const base = {
    capturaUserId: "u-oper",
    autorizaUserId: "u-jefe",
    entrega: "Depósito General",
    obs: "Línea base de inventario (ficticia).",
    estado: "aplicado" as const,
  };
  ubic.forEach((u, k) => {
    const arms = armas.filter((_, i) => i % ubic.length === k);
    folios.push({
      ...base,
      id: `f${n}`,
      numero: n,
      fecha: t0,
      fechaAutoriza: t0,
      tipo: "inicial",
      depositoDestinoId: u.d,
      agrupDestinoId: u.a,
      recibe: "Depositario",
      partidas: [
        ...arms.map((a) => ({ armaId: a.id, cantidad: 1 })),
        { itemId: "c1", cantidad: 40 + k * 5 },
        { itemId: "c2", cantidad: 30 + k * 4 },
        { itemId: "c3", cantidad: 2000 + k * 500 },
        { itemId: "c4", cantidad: 1500 + k * 300 },
        { itemId: "c5", cantidad: 200 },
        { itemId: "c6", cantidad: 10 + k },
        { itemId: "c7", cantidad: 6 },
      ],
    });
    n++;
  });
  const t1 = "2026-02-10T10:30:00.000Z";
  // Extracción personal aplicada (SPE)
  folios.push({
    ...base,
    id: `f${n}`,
    numero: n,
    fecha: t1,
    fechaAutoriza: t1,
    tipo: "ext_personal",
    depositoOrigenId: "dep-nte",
    agrupOrigenId: "ag-spe",
    personaId: "p2",
    entrega: "Depositario Zona Norte",
    recibe: "Elemento María Ficticia Dos",
    obs: "Resguardo personal para servicio de escolta (ficticio).",
    partidas: [{ armaId: "a5", cantidad: 1 }, { itemId: "c1", cantidad: 3 }, { itemId: "c3", cantidad: 45 }],
  });
  n++;
  // Transferencia pendiente de autorizar
  folios.push({
    id: `f${n}`,
    numero: n,
    fecha: "2026-03-02T12:00:00.000Z",
    tipo: "transferencia",
    depositoOrigenId: "dep-drag",
    agrupOrigenId: "ag-jag",
    agrupDestinoId: "ag-eriv",
    capturaUserId: "u-depo",
    entrega: "Escuadrón Jaguares",
    recibe: "Escuadrón ERIV",
    obs: "Cambio de adscripción sin traslado físico (ficticio).",
    estado: "pendiente",
    partidas: [{ armaId: "a3", cantidad: 1 }],
  });
  n++;
  // Folio pendiente con solicitud de cancelación
  folios.push({
    id: `f${n}`,
    numero: n,
    fecha: "2026-03-05T16:20:00.000Z",
    tipo: "extraccion",
    depositoOrigenId: "dep-gral",
    agrupOrigenId: "ag-hal",
    capturaUserId: "u-oper",
    entrega: "Depósito General",
    recibe: "Taller externo (ficticio)",
    obs: "Capturado por error.",
    estado: "pendiente",
    partidas: [{ itemId: "c6", cantidad: 2 }],
    cancelacion: { motivo: "Captura duplicada del movimiento.", solicitaUserId: "u-oper", fechaSolicitud: "2026-03-05T17:00:00.000Z" },
  });

  return {
    version: 1,
    usuarios,
    depositos,
    agrupamientos,
    personas,
    armas,
    consumibles,
    folios,
    auditoria: [
      { id: "au0", fecha: t0, userId: "u-admin", accion: "SEED", detalle: "Carga de datos ficticios de demostración" },
    ],
  };
}
