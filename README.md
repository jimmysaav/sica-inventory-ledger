# Sica Inventory Ledger

PROYECTO: SISTEMA INTEGRAL DE CONTROL DE ARMAMENTO — LOC 44

1. OBJETIVO GENERAL

Desarrolla una aplicación web institucional, moderna, profesional y multiusuario para la Secretaría de Seguridad del Estado de Jalisco, México.

Nombre del sistema: SISTEMA INTEGRAL DE CONTROL DE ARMAMENTO (SICA).

El objetivo es administrar el inventario institucional de armamento, cargadores, cartuchos y granadas, centralizando la información de todos los depósitos y agrupamientos, con controles documentales, permisos jerárquicos, auditoría y trazabilidad.

La aplicación debe ser compatible con computadoras Windows y estar diseñada para una futura implementación en servidores institucionales.

IMPORTANTE: Inicialmente desarrolla un prototipo con datos completamente ficticios. No utilices información operativa real.

2. PROBLEMA QUE DEBE RESOLVER

Actualmente existe un sistema de control de armamento, pero presenta limitaciones administrativas.

Los principales problemas son:

Un depósito físico puede resguardar armamento de varios agrupamientos diferentes.

Los registros de adscripción no siempre están actualizados.

Para cambiar la adscripción de un arma, el procedimiento tradicional exige devolverla físicamente al Depósito General y posteriormente entregarla al nuevo agrupamiento mediante otro folio.

Existen armas y otros bienes entregados directamente a personas mediante folios de extracción personal.

Los registros históricos de cartuchos requieren conciliación y una nueva línea base de inventario.

Se necesitan permisos jerárquicos para autorizar operaciones y cancelar folios.

Se requiere conocer oportunamente el estado de fuerza institucional.

La aplicación debe resolver estos problemas sin duplicar existencias ni eliminar antecedentes documentales.

3. CONCEPTOS FUNDAMENTALES

El sistema debe distinguir claramente:

Depósito custodio: instalación donde se encuentran físicamente los bienes.

Agrupamiento de adscripción: unidad policial a la que están asignados administrativamente.

Responsable del resguardo: depósito, funcionario o elemento que tiene la responsabilidad formal sobre los bienes.

Ubicación física: lugar donde efectivamente se encuentran.

Estado de fuerza: relación actualizada de existencias y asignaciones institucionales.

Trazabilidad: historial completo de operaciones, documentos, responsables, autorizaciones, fechas y cambios.

Estas relaciones deben ser independientes.

Un arma puede estar adscrita a un agrupamiento, resguardada físicamente en otro depósito y asignada bajo responsabilidad individual, según corresponda.

4. MÓDULOS DE LA APLICACIÓN

MÓDULO 1. PANEL PRINCIPAL

Crear un dashboard ejecutivo con indicadores:

Total de armas registradas.

Armas asignadas.

Armas disponibles.

Armas en mantenimiento.

Existencias de cartuchos.

Existencias de cargadores.

Existencias de granadas.

Folios pendientes.

Transferencias pendientes de confirmación.

Conciliaciones pendientes.

Alertas administrativas.

Incluir filtros por agrupamiento, depósito, categoría y fecha de corte.

MÓDULO 2. INVENTARIO MAESTRO

Crear un catálogo institucional de bienes.

Para armas incluir:

Identificador interno único.

Número progresivo.

Tipo de arma.

Marca.

Modelo.

Calibre.

Matrícula.

Situación administrativa.

Adscripción.

Custodio.

Ubicación física.

Estado de conservación.

Referencia documental.

Para cargadores incluir tipo, compatibilidad, capacidad y cantidad.

Para cartuchos incluir calibre, lote cuando corresponda y cantidad.

Para granadas incluir tipo, calibre y cantidad.

Las matrículas deben validarse para evitar registros duplicados.

MÓDULO 3. DEPÓSITOS Y AGRUPAMIENTOS

Crear catálogos independientes de depósitos y agrupamientos.

Permitir que un depósito custodie bienes de múltiples agrupamientos.

Ejemplo ficticio:

Depósito Dragones.

Agrupamiento Dragones.

Escuadrón Jaguares.

Escuadrón ERIV.

El sistema debe mostrar tanto las existencias físicas del depósito como las existencias administrativas de cada agrupamiento.

No duplicar los bienes cuando existan estas relaciones.

MÓDULO 4. FOLIOS DOCUMENTALES

Desarrollar un módulo de folios con numeración única y consecutiva.

Tipos:

Introducción.

Extracción.

Transferencia administrativa.

Extracción personal.

Devolución personal.

Ajuste autorizado.

Corrección o reversión.

Cada folio tendrá:

Número único.

Fecha y hora.

Tipo de movimiento.

Origen.

Destino.

Usuario que captura.

Autoridad que autoriza.

Responsable que entrega.

Responsable que recibe.

Bienes y cantidades relacionados.

Observaciones.

Estado documental.

Evidencias y firmas pendientes.

Permitir generar documentos PDF imprimibles.

MÓDULO 5. TRANSFERENCIAS ENTRE AGRUPAMIENTOS

Este es uno de los módulos más importantes.

Permitir registrar cambios de adscripción administrativa entre agrupamientos sin exigir un traslado físico al Depósito General.

El sistema debe distinguir:

Cambio de adscripción administrativa.

Movimiento físico.

Entrega y recepción.

Formalización documental.

Generar un folio único y conservar el historial.

Una transferencia administrativa autorizada podrá reflejarse en el estado de fuerza correspondiente, sin modificar automáticamente la ubicación física.

Los movimientos físicos pendientes deberán permanecer identificados hasta su confirmación.

MÓDULO 6. RESGUARDOS PERSONALES

Permitir que armas, cargadores, cartuchos y granadas queden bajo responsabilidad directa de una persona mediante folio de extracción personal.

Contemplar personal de distintas áreas, incluyendo el Servicio de Protección Estatal.

Registrar:

Responsable.

Identificador institucional.

Adscripción.

Bienes bajo resguardo.

Fecha de entrega.

Folio de extracción.

Situación del resguardo.

Fecha de devolución, cuando corresponda.

Generar reportes individuales de resguardo sin duplicar existencias institucionales.

MÓDULO 7. INVENTARIO INICIAL Y CONCILIACIÓN

Permitir capturar un inventario físico inicial por depósito y categoría.

Comparar:

Existencias físicas.

Existencias documentales.

Diferencias detectadas.

Diferencias aclaradas.

Ajustes autorizados.

Las diferencias deben quedar documentadas y no podrán desaparecer mediante modificaciones directas de saldos.

Conservar la fecha de corte y los responsables del levantamiento.

MÓDULO 8. USUARIOS Y PERMISOS

Implementar autenticación y roles.

Roles iniciales:

Administrador institucional.

Jefe del Depósito General.

Operador del Depósito General.

Depositario de agrupamiento.

Usuario de consulta.

Auditor.

Aplicar permisos según funciones.

Cada operación debe registrar automáticamente usuario, fecha y hora.

Los usuarios solamente podrán acceder a los módulos y datos autorizados.

MÓDULO 9. CANCELACIÓN DE FOLIOS

La cancelación será una función exclusiva del jefe del Depósito General.

Otros usuarios podrán solicitarla.

Para cancelar exigir:

Folio.

Motivo obligatorio.

Usuario solicitante.

Autorizador.

Fecha y hora.

Registro de auditoría.

Los folios cancelados conservarán su número y antecedentes.

Un folio cancelado no debe producir efectos activos sobre existencias.

Cuando un folio ya haya generado movimientos, utilizar una reversión documentada en lugar de eliminar registros históricos.

MÓDULO 10. REPORTES

Crear reportes descargables en PDF y Excel:

Estado de fuerza general.

Estado de fuerza por agrupamiento.

Existencias por depósito físico.

Armamento bajo resguardo personal.

Inventario por tipo y calibre.

Existencias de cargadores.

Existencias de cartuchos.

Existencias de granadas.

Historial de movimientos.

Transferencias administrativas.

Folios cancelados.

Diferencias de inventario.

Conciliaciones.

Reporte a fecha de corte.

Incluir búsqueda por matrícula, folio, responsable y agrupamiento.

5. DISEÑO VISUAL

Crear una interfaz institucional sobria y profesional.

Características:

Diseño minimalista.

Fondo blanco y gris claro.

Azul marino institucional.

Tipografía moderna y legible.

Menú lateral de navegación.

Tablas con filtros y búsqueda.

Indicadores ejecutivos.

Formularios claros.

Estados visuales discretos.

Diseño adaptable a diferentes resoluciones de Windows.

Evitar elementos decorativos innecesarios.

Priorizar rapidez de consulta, claridad y facilidad de operación.

6. BASE DE DATOS

Diseñar una base de datos relacional normalizada.

Crear entidades separadas para:

Usuarios.

Roles.

Permisos.

Depósitos.

Agrupamientos.

Personas.

Bienes.

Tipos de bienes.

Armas.

Existencias por categoría.

Resguardos.

Folios.

Partidas de folios.

Movimientos.

Transferencias.

Conciliaciones.

Ajustes autorizados.

Evidencias documentales.

Auditoría.

Evitar que las existencias se administren mediante cifras modificables manualmente.

Los saldos deberán calcularse a partir de movimientos válidos y del inventario inicial autorizado.

7. REQUISITOS DE SEGURIDAD

Implementar:

Autenticación individual.

Permisos por rol.

Validaciones del lado del servidor.

Registro de auditoría.

Protección contra duplicación de movimientos.

Transacciones atómicas.

Restricciones de integridad.

Conservación del historial.

Gestión segura de sesiones.

Mecanismos de respaldo.

Separación entre datos de prueba y producción.

No almacenar contraseñas en texto plano.

No utilizar servicios públicos externos para almacenar datos reales de armamento sin autorización institucional.

8. REQUISITOS TÉCNICOS

Desarrollar inicialmente una aplicación web funcional, compatible con navegadores modernos de Windows.

Utilizar tecnologías mantenibles, arquitectura modular y base de datos relacional.

El proyecto deberá poder exportarse para evaluación de despliegue en infraestructura institucional.

No asumir que la aplicación será instalada en servidores internos simplemente por estar publicada en Lovable.

Documentar las dependencias externas, los requisitos de alojamiento y las limitaciones de la plataforma.

9. PRIMERA ENTREGA

Construye una primera versión funcional que incluya:

Inicio de sesión demostrativo.

Panel principal.

Catálogo de depósitos.

Catálogo de agrupamientos.

Inventario maestro.

Consulta de adscripción y custodia.

Registro de folios.

Solicitud de cancelación.

Control básico de permisos.

Reportes demostrativos.

Utiliza exclusivamente datos ficticios.

No presentes pantallas simuladas como funcionalidades terminadas.

Identifica claramente qué funciones están implementadas y cuáles están pendientes.

10. RESULTADO ESPERADO

Una plataforma institucional centralizada, auditable y escalable que permita conocer las existencias, adscripciones, custodias y resguardos del armamento y demás bienes controlados.

PRINCIPIO RECTOR:

Un solo inventario institucional, múltiples depósitos y agrupamientos, responsabilidades claramente definidas, permisos jerárquicos y trazabilidad documental completa.

Comienza creando la arquitectura de la aplicación, el modelo relacional de datos, el sistema de navegación y el prototipo funcional de los módulos principales.

Prioriza la integridad de la información, la claridad operativa y la seguridad institucional sobre la apariencia visual.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/80d74a32-cc1c-56b2-b0ac-5f3b52bedb74).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
