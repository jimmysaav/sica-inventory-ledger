import { createFileRoute } from "@tanstack/react-router";
import { useUsuario } from "@/components/sica/Shell";
import { Badge, PageHeader } from "@/components/sica/ui";
import { reiniciarDemo } from "@/lib/sica/store";

export const Route = createFileRoute("/estado-sistema")({
  head: () => ({
    meta: [
      { title: "Estado del desarrollo — SICA" },
      { name: "description", content: "Funciones implementadas y pendientes del prototipo." },
      { property: "og:title", content: "Estado del desarrollo — SICA" },
      { property: "og:description", content: "Funciones implementadas y pendientes del prototipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Estado,
});

const ITEMS: [string, "ok" | "parcial" | "pendiente", string][] = [
  ["Inicio de sesión", "parcial", "Demostrativo (contraseña 'demo'). Sin autenticación segura ni cifrado."],
  ["Panel principal", "ok", "Indicadores calculados con filtros por agrupamiento, depósito, categoría y fecha de corte."],
  ["Inventario maestro", "ok", "Armas con matrícula única validada; cargadores, cartuchos y granadas. Alta de tipos de consumible pendiente."],
  ["Depósitos y agrupamientos", "ok", "Catálogos independientes; un depósito custodia bienes de varios agrupamientos sin duplicar."],
  ["Consulta de adscripción y custodia", "ok", "Por matrícula, con historial de folios."],
  ["Folios documentales", "ok", "Numeración consecutiva, 7 tipos, captura → autorización. Saldos solo desde folios aplicados."],
  ["Transferencias entre agrupamientos", "ok", "Cambio administrativo sin traslado físico; traslado físico opcional queda pendiente hasta confirmación."],
  ["Resguardos personales", "parcial", "Extracción y devolución personal; consulta de resguardos. Reporte individual dedicado pendiente."],
  ["Cancelación de folios", "ok", "Solicitud con motivo; resolución exclusiva del Jefe del Depósito General; reversión documentada para folios aplicados."],
  ["Permisos por rol", "parcial", "6 roles aplicados en la interfaz y en el motor de reglas. En producción deben validarse en servidor."],
  ["Auditoría", "ok", "Bitácora automática de cada operación."],
  ["Reportes", "parcial", "11 reportes en CSV (Excel) y PDF vía impresión. Diferencias y conciliaciones pendientes."],
  ["Inventario inicial y conciliación", "pendiente", "La línea base existe como folios de 'Inventario inicial'; falta el levantamiento físico y la comparación."],
  ["Evidencias documentales y firmas", "pendiente", "Carga de archivos y firma electrónica."],
  ["Base de datos en servidor", "pendiente", "Los datos se guardan solo en este navegador. Ver docs/modelo-relacional.sql."],
  ["Respaldos, separación prueba/producción", "pendiente", "Depende de la infraestructura institucional."],
];

function Estado() {
  const user = useUsuario();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Estado del desarrollo" desc="Primera entrega. Prototipo con datos ficticios; no apto para uso operativo." />
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Función</th><th>Estado</th><th>Notas</th></tr></thead>
          <tbody>{ITEMS.map(([f, e, d]) => <tr key={f}><td className="font-medium">{f}</td><td><Badge tone={e === "ok" ? "ok" : e === "parcial" ? "warn" : "neutral"}>{e === "ok" ? "Implementado" : e === "parcial" ? "Parcial" : "Pendiente"}</Badge></td><td className="text-muted-foreground">{d}</td></tr>)}</tbody>
        </table>
      </div>
      {user?.rol === "admin" && <button className="btn mt-4" onClick={() => confirm("¿Restaurar datos ficticios originales?") && reiniciarDemo()}>Restaurar datos de demostración</button>}
    </div>
  );
}
