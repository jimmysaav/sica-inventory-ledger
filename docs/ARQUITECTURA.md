# SICA — Arquitectura del prototipo (primera entrega)

**Datos 100 % ficticios. No apto para uso operativo.**

## Estado actual
- Frontend: React 19 + TanStack Start/Router, Tailwind CSS v4. Compatible con Chrome/Edge en Windows.
- Motor de reglas: `src/lib/sica/engine.ts` (funciones puras, con pruebas en `engine.test.ts`).
  - Saldos calculados desde folios aplicados (nunca editables).
  - Folio: captura → pendiente → autorización (aplica efectos). Cancelación solo sin efectos y solo por el Jefe del Depósito General; folios aplicados se revierten con un nuevo folio.
  - Adscripción (agrupamiento), custodia (depósito) y resguardo (persona) son dimensiones independientes del saldo.
- Persistencia: **solo localStorage del navegador** (`src/lib/sica/store.ts`). Cada navegador tiene su propia copia.
- Autenticación: **demostrativa**, sin seguridad real.

## Pendiente para producción
1. Base de datos relacional en servidor institucional (ver `modelo-relacional.sql`), con transacciones atómicas al autorizar folios.
2. Mover el motor de reglas al servidor; la interfaz no debe ser la fuente de verdad de permisos.
3. Autenticación individual (contraseñas con hash Argon2/bcrypt, sesiones seguras, bloqueo por intentos), idealmente integrada al directorio institucional.
4. Respaldos, ambientes separados de prueba/producción, evidencias documentales con hash, firmas.
5. Módulo de inventario inicial y conciliación.

## Dependencias y alojamiento
- Dependencias npm listadas en `package.json` (sin servicios externos de datos). Tipografía IBM Plex desde Google Fonts (sustituible por archivos locales).
- Publicar en Lovable aloja la app en infraestructura pública en la nube; **no** equivale a instalarla en servidores institucionales. Para uso real se requiere exportar el código y desplegarlo internamente previa autorización.
