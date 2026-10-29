import { createFileRoute } from "@tanstack/react-router";
import { Catalogo } from "@/components/sica/Catalogo";

export const Route = createFileRoute("/depositos")({
  head: () => ({
    meta: [
      { title: "Depósitos — SICA" },
      { name: "description", content: "Catálogo de depósitos y existencias físicas por agrupamiento." },
      { property: "og:title", content: "Depósitos — SICA" },
      { property: "og:description", content: "Catálogo de depósitos y existencias físicas por agrupamiento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Catalogo tipo="deposito" />,
});
