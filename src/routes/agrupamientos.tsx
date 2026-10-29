import { createFileRoute } from "@tanstack/react-router";
import { Catalogo } from "@/components/sica/Catalogo";

export const Route = createFileRoute("/agrupamientos")({
  head: () => ({
    meta: [
      { title: "Agrupamientos — SICA" },
      { name: "description", content: "Catálogo de agrupamientos y estado de fuerza administrativo." },
      { property: "og:title", content: "Agrupamientos — SICA" },
      { property: "og:description", content: "Catálogo de agrupamientos y estado de fuerza administrativo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Catalogo tipo="agrupamiento" />,
});
