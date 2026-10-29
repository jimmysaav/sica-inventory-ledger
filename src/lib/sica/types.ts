export type Rol = "admin" | "jefe" | "operador" | "depositario" | "consulta" | "auditor";
export type Categoria = "cargador" | "cartucho" | "granada";
export type TipoFolio =
  | "inicial"
  | "introduccion"
  | "extraccion"
  | "transferencia"
  | "ext_personal"
  | "dev_personal"
  | "ajuste"
  | "reversion";
export type EstadoFolio = "pendiente" | "aplicado" | "cancelado" | "revertido";

export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  rol: Rol;
  agrupamientoId?: string;
}
export interface Deposito {
  id: string;
  clave: string;
  nombre: string;
  tipo: "general" | "regional";
}
export interface Agrupamiento {
  id: string;
  clave: string;
  nombre: string;
}
export interface Persona {
  id: string;
  nombre: string;
  idInst: string;
  area: string;
  agrupamientoId: string;
}
export interface Arma {
  id: string;
  progresivo: number;
  tipo: string;
  marca: string;
  modelo: string;
  calibre: string;
  matricula: string;
  conservacion: "bueno" | "regular" | "malo";
  mantenimiento: boolean;
  refDoc: string;
}
export interface Consumible {
  id: string;
  categoria: Categoria;
  descripcion: string;
  calibre: string;
  detalle: string;
}
export interface Partida {
  armaId?: string;
  itemId?: string;
  cantidad: number;
}
export interface SolicitudCancelacion {
  motivo: string;
  solicitaUserId: string;
  fechaSolicitud: string;
  resultado?: "aprobada" | "rechazada";
  resuelveUserId?: string;
  fechaResolucion?: string;
  nota?: string;
}
export interface Folio {
  id: string;
  numero: number;
  fecha: string;
  tipo: TipoFolio;
  depositoOrigenId?: string;
  agrupOrigenId?: string;
  depositoDestinoId?: string;
  agrupDestinoId?: string;
  personaId?: string;
  capturaUserId: string;
  autorizaUserId?: string;
  fechaAutoriza?: string;
  entrega: string;
  recibe: string;
  partidas: Partida[];
  obs: string;
  estado: EstadoFolio;
  /** Transferencia con traslado físico: false = traslado pendiente de confirmar */
  fisicoConfirmado?: boolean;
  refFolioId?: string;
  revertidoPorId?: string;
  cancelacion?: SolicitudCancelacion;
}
export interface Auditoria {
  id: string;
  fecha: string;
  userId: string;
  accion: string;
  detalle: string;
}
export interface SicaState {
  version: number;
  usuarios: Usuario[];
  depositos: Deposito[];
  agrupamientos: Agrupamiento[];
  personas: Persona[];
  armas: Arma[];
  consumibles: Consumible[];
  folios: Folio[];
  auditoria: Auditoria[];
}

export const TIPO_FOLIO_LABEL: Record<TipoFolio, string> = {
  inicial: "Inventario inicial",
  introduccion: "Introducción",
  extraccion: "Extracción",
  transferencia: "Transferencia administrativa",
  ext_personal: "Extracción personal",
  dev_personal: "Devolución personal",
  ajuste: "Ajuste autorizado",
  reversion: "Corrección / reversión",
};
export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador institucional",
  jefe: "Jefe del Depósito General",
  operador: "Operador del Depósito General",
  depositario: "Depositario de agrupamiento",
  consulta: "Usuario de consulta",
  auditor: "Auditor",
};
export const CATEGORIA_LABEL: Record<Categoria, string> = {
  cargador: "Cargadores",
  cartucho: "Cartuchos",
  granada: "Granadas",
};
export const folioNumero = (n: number) => `SICA-${String(n).padStart(6, "0")}`;
