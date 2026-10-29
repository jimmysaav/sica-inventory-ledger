/**
 * Almacén del prototipo: persiste en localStorage del navegador.
 * PENDIENTE: sustituir por base de datos relacional en servidor institucional.
 */
import { useSyncExternalStore } from "react";
import { crearSeed } from "./seed";
import type { SicaState } from "./types";

const KEY = "sica-prototipo-v1";
const SESION = "sica-sesion";
let state: SicaState | null = null;
let sesion: string | null = null;
const listeners = new Set<() => void>();

function load(): SicaState {
  if (state) return state;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    state = raw ? (JSON.parse(raw) as SicaState) : crearSeed();
    sesion = typeof window !== "undefined" ? sessionStorage.getItem(SESION) : null;
  } catch {
    state = crearSeed();
  }
  return state;
}
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSica() {
  return useSyncExternalStore(subscribe, load, load);
}
export function useSesion() {
  return useSyncExternalStore(
    subscribe,
    () => (load(), sesion),
    () => null,
  );
}
export function commit(next: SicaState) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}
export function iniciarSesion(userId: string | null) {
  sesion = userId;
  if (userId) sessionStorage.setItem(SESION, userId);
  else sessionStorage.removeItem(SESION);
  emit();
}
export function reiniciarDemo() {
  commit(crearSeed());
}
