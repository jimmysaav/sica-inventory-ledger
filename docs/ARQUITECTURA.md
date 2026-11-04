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
- LOC 44: campos documentales ampliados; listado filtrable, Excel XLSX e impresión. No representa un formato oficial aprobado. Las filas anteriores conservan campos no capturados vacíos.
- Excel: lectura y escritura local con ExcelJS cargado bajo demanda. Primera hoja, encabezados en fila 1; fórmulas rechazadas. Importaciones atómicas exclusivas del Jefe en el motor demostrativo. Inventario inicial/compras crean catálogo y folio pendiente; al autorizar se derivan saldos. Un lote tiene un depósito y agrupamiento destino; distintos destinos requieren lotes separados. Actualización por matrícula conserva posiciones, mantenimiento y conservación; sustituye campos documentales (vacíos incluidos) y registra antes/después, usuario y fecha/hora. No borra armas ausentes del archivo.
- Depósito DESSPEJA agregado como segundo general, sin saldos ficticios adicionales ni eliminación de catálogos previos.

## Pendiente para producción
1. Base de datos relacional en servidor institucional (ver `modelo-relacional.sql`), con transacciones atómicas al autorizar folios.
2. Mover el motor de reglas al servidor; la interfaz no debe ser la fuente de verdad de permisos.
3. Autenticación individual (contraseñas con hash Argon2/bcrypt, sesiones seguras, bloqueo por intentos), idealmente integrada al directorio institucional.
4. Respaldos, ambientes separados de prueba/producción, evidencias documentales con hash, firmas.
5. Módulo de inventario inicial y conciliación.
6. Programa Windows aislado separado: una computadora por depósito, sin internet ni sincronización automática. Distribución e instalación locales; almacenamiento protegido, autenticación individual, respaldos y transferencia controlada de informes mediante archivos. Esta web no es todavía ese programa ni debe instalarse como solución operativa.
7. Ampliar datos laborales, bienes de equipo operativo, entregas/devoluciones diarias, informes balísticos por periodo, resguardos individuales e informe mensual automático. Los catálogos de instituciones y 125 municipios deben provenir de un listado validado; no se inventan registros operativos.
8. Biometría: lector e interfaz compatibles, autorización institucional y política de protección/retención antes de integrar. No hay captura ni simulación de huellas.

## Dependencias y alojamiento
- Dependencias npm listadas en `package.json` (sin servicios externos de datos). Tipografía IBM Plex desde Google Fonts (sustituible por archivos locales).
- Publicar en Lovable aloja la app en infraestructura pública en la nube; **no** equivale a instalarla en servidores institucionales. Para uso real se requiere exportar el código y desplegarlo internamente previa autorización.
