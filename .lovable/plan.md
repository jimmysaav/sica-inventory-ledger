# SICA para Windows sin red ni internet

## Resultado
Un programa independiente para una computadora por depósito, que abre desde Windows sin internet ni red local. Inventario y movimientos permanecen en esa computadora. Los informes se imprimen o se entregan al sistema central mediante archivos, sin sincronización automática.

La LOC 44 del prototipo ya tiene campos ampliados, importación Excel con validación, folios pendientes de autorización, exportación XLSX y Depósito DESSPEJA. Se verificaron 13 pruebas y una carga ficticia completa hasta la autorización y descarga.

## Entregas por etapas
1. **Versión Windows de prueba.** Adaptar la aplicación existente para ejecutarse localmente; incluir todos los archivos y tipografías, sin llamadas externas, con inventario, folios, LOC 44 y reportes. Entregar una carpeta comprimida para Windows de 64 bits con el ejecutable y las instrucciones. No prometer un instalador firmado; el primer paquete será una versión portable.
2. **Operación local protegida.** Configurar el depósito, usuarios individuales, contraseñas seguras, almacenamiento local transaccional, permisos fuera de la interfaz y auditoría de movimientos. Añadir respaldo y restauración verificada mediante archivos. Mantener saldos derivados de folios, sin modificación manual.
3. **Informes del depósito.** Incorporar elementos y datos laborales, equipo operativo, entregas/devoluciones diarias y resguardos individuales; generar informes mensuales de armas, cartuchos, cargadores y granadas por rango de fechas. Informes balísticos y estado de fuerza requieren validar sus columnas y formato institucional antes de considerarlos oficiales.

## Verificación
- Abrir el programa y reiniciarlo sin conexiones externas: conservar datos y sesión según la política local.
- Capturar un bien ficticio, autorizar un movimiento, registrar entrega y devolución, consultar historial y generar Excel e impresión sin internet.
- Comprobar permisos, rechazo de duplicados, bloqueo de saldos negativos y respaldo/restauración.
- Validar ejecución en Windows con una prueba del paquete en una computadora Windows; la preparación desde este entorno no sustituye esa comprobación.

## Límites y créditos
- No es posible garantizar un número exacto de créditos para terminar. El desarrollo se cobra por el trabajo realizado; revisar cada etapa evita tratar toda la entrega como un único compromiso de costo.
- El uso del programa totalmente local no debe consumir créditos de Lovable ni depender de Lovable Cloud, IA o servicios externos.
- La versión de prueba seguirá usando solo información ficticia. El uso operativo requiere revisión institucional de seguridad, protección de datos y respaldos.
- Huella digital queda fuera de la primera entrega: requiere lector compatible, su interfaz de integración y autorización institucional. No se simulará.

## Detalles técnicos
- Mantener React y TanStack Router; adaptar una salida cliente local sin depender del servidor de TanStack Start. No cargar la URL de la web en una ventana de escritorio.
- Usar Electron con aislamiento de contexto, sin integración Node en la interfaz, y una interfaz local mínima y validada para almacenamiento y exportaciones. Mantener el código Windows dentro del proyecto y separar su configuración de la web actual para no romper la vista previa.
- Reutilizar el motor puro de reglas y el mapeo LOC 44; mover persistencia local segura y autenticación al proceso de escritorio. No presentar los permisos demostrativos actuales como seguridad real.
- Preparar el paquete con `@electron/packager`; excluir metadatos del repositorio, dependencias de desarrollo y código innecesario del archivo de distribución. Inspeccionar el archivo antes de entregarlo.