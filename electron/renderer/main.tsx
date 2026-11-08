import React from "react";
import { createRoot } from "react-dom/client";
import { createRootRoute, createRoute, createRouter, createHashHistory, RouterProvider, Outlet, Link } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Package, Users, FileText, LogOut, ShieldCheck, Archive, ArrowLeftRight } from "lucide-react";
import { Button } from "../../src/components/ui/button";
import { LocalProvider, useLocal } from "./context";
import { Inventory, Elements, Daily, Reports, Settings, Audit, Folios } from "./pages";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./styles.css";

const items = [
  { path: "/", label: "Inventario · LOC 44", icon: Package, component: Inventory },
  { path: "/elementos", label: "Elementos", icon: Users, component: Elements },
  { path: "/servicio", label: "Entrega / devolución", icon: ArrowLeftRight, component: Daily },
  { path: "/folios", label: "Folios", icon: FileText, component: Folios },
  { path: "/informes", label: "Informes y resguardos", icon: FileText, component: Reports },
  { path: "/ajustes", label: "Usuarios y respaldos", icon: Archive, component: Settings },
  { path: "/auditoria", label: "Auditoría", icon: ShieldCheck, component: Audit },
] as const;
function Frame() {
  const {session, logout}=useLocal();
  return <div className="flex min-h-screen"><aside className="no-print w-56 shrink-0 border-r bg-sidebar p-3 text-sidebar-foreground"><h1 className="mb-5 px-2 text-xl font-semibold">SICA Local</h1><nav>{items.map((item)=><Link key={item.path} to={item.path} className="mb-1 flex items-center gap-2 rounded p-2 text-sm" activeProps={{className:"bg-sidebar-accent text-sidebar-accent-foreground"}}><item.icon className="h-4 w-4"/>{item.label}</Link>)}</nav></aside><div className="min-w-0 flex-1"><header className="no-print flex flex-wrap items-center justify-between gap-2 border-b p-4"><p className="text-xs font-semibold text-warning">SIN INTERNET · DATOS FICTICIOS · NO OPERATIVO</p><div className="flex items-center gap-3"><span className="text-sm">{session.user.nombre} · {session.user.rol}</span><Button variant="outline" onClick={logout}><LogOut/>Salir</Button></div></header><main className="p-6"><Outlet/></main></div></div>;
}
const rootRoute=createRootRoute({component:()=> <LocalProvider><Frame/></LocalProvider>});
const routeTree=rootRoute.addChildren(items.map((item)=>createRoute({getParentRoute:()=>rootRoute,path:item.path,component:item.component})));
const router=createRouter({routeTree,history:createHashHistory()});
const container=document.getElementById("root");
if(container)createRoot(container).render(<React.StrictMode><RouterProvider router={router}/><Toaster richColors/></React.StrictMode>);