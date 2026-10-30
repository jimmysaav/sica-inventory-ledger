-- SICA · Modelo relacional propuesto (PostgreSQL). Prototipo: aún no desplegado.
-- Principio: los saldos NO se almacenan; se calculan desde movimientos de folios aplicados.
CREATE TABLE roles (id serial PRIMARY KEY, clave text UNIQUE NOT NULL, nombre text NOT NULL);
CREATE TABLE permisos (id serial PRIMARY KEY, clave text UNIQUE NOT NULL);
CREATE TABLE rol_permisos (rol_id int REFERENCES roles, permiso_id int REFERENCES permisos, PRIMARY KEY (rol_id, permiso_id));
CREATE TABLE agrupamientos (id uuid PRIMARY KEY, clave text UNIQUE NOT NULL, nombre text NOT NULL, activo bool DEFAULT true);
CREATE TABLE depositos (id uuid PRIMARY KEY, clave text UNIQUE NOT NULL, nombre text NOT NULL, tipo text CHECK (tipo IN ('general','regional')));
CREATE TABLE usuarios (id uuid PRIMARY KEY, usuario text UNIQUE NOT NULL, nombre text NOT NULL, password_hash text NOT NULL,
  agrupamiento_id uuid REFERENCES agrupamientos, activo bool DEFAULT true);
CREATE TABLE usuario_roles (usuario_id uuid REFERENCES usuarios, rol_id int REFERENCES roles, PRIMARY KEY (usuario_id, rol_id));
CREATE TABLE personas (id uuid PRIMARY KEY, id_institucional text UNIQUE NOT NULL, nombre text NOT NULL, area text, agrupamiento_id uuid REFERENCES agrupamientos);
CREATE TABLE tipos_bien (id serial PRIMARY KEY, categoria text CHECK (categoria IN ('arma','cargador','cartucho','granada')), descripcion text NOT NULL,
  calibre text, compatibilidad text, capacidad int, lote text);
CREATE TABLE armas (id uuid PRIMARY KEY, progresivo int UNIQUE NOT NULL, tipo_bien_id int REFERENCES tipos_bien, marca text, modelo text, calibre text,
  matricula text NOT NULL, conservacion text, en_mantenimiento bool DEFAULT false, referencia_documental text);
CREATE UNIQUE INDEX armas_matricula_uq ON armas (upper(matricula));
CREATE SEQUENCE folio_numero_seq;
CREATE TABLE folios (id uuid PRIMARY KEY, numero bigint UNIQUE NOT NULL DEFAULT nextval('folio_numero_seq'),
  tipo text NOT NULL CHECK (tipo IN ('inicial','introduccion','extraccion','transferencia','ext_personal','dev_personal','ajuste','reversion')),
  estado text NOT NULL CHECK (estado IN ('pendiente','aplicado','cancelado','revertido')),
  fecha timestamptz NOT NULL DEFAULT now(), deposito_origen_id uuid REFERENCES depositos, agrupamiento_origen_id uuid REFERENCES agrupamientos,
  deposito_destino_id uuid REFERENCES depositos, agrupamiento_destino_id uuid REFERENCES agrupamientos, persona_id uuid REFERENCES personas,
  captura_usuario_id uuid NOT NULL REFERENCES usuarios, autoriza_usuario_id uuid REFERENCES usuarios, fecha_autoriza timestamptz,
  entrega text, recibe text, observaciones text, folio_referencia_id uuid REFERENCES folios, fisico_confirmado bool,
  idempotency_key uuid UNIQUE);  -- protección contra duplicación de envíos
CREATE TABLE folio_partidas (id bigserial PRIMARY KEY, folio_id uuid NOT NULL REFERENCES folios, arma_id uuid REFERENCES armas,
  tipo_bien_id int REFERENCES tipos_bien, cantidad int NOT NULL, CHECK ((arma_id IS NULL) <> (tipo_bien_id IS NULL)));
-- Movimientos: asiento contable generado en la misma transacción que autoriza el folio. Nunca se actualizan ni eliminan.
CREATE TABLE movimientos (id bigserial PRIMARY KEY, folio_id uuid NOT NULL REFERENCES folios, arma_id uuid REFERENCES armas, tipo_bien_id int REFERENCES tipos_bien,
  deposito_id uuid NOT NULL REFERENCES depositos, agrupamiento_id uuid NOT NULL REFERENCES agrupamientos, persona_id uuid REFERENCES personas,
  delta int NOT NULL, creado timestamptz DEFAULT now());
CREATE VIEW existencias AS SELECT arma_id, tipo_bien_id, deposito_id, agrupamiento_id, persona_id, sum(delta) AS cantidad
  FROM movimientos GROUP BY 1,2,3,4,5 HAVING sum(delta) <> 0;
CREATE TABLE transferencias (folio_id uuid PRIMARY KEY REFERENCES folios, requiere_traslado bool, fecha_confirmacion_fisica timestamptz, confirma_usuario_id uuid REFERENCES usuarios);
CREATE TABLE resguardos (id uuid PRIMARY KEY, persona_id uuid NOT NULL REFERENCES personas, folio_extraccion_id uuid NOT NULL REFERENCES folios,
  folio_devolucion_id uuid REFERENCES folios, situacion text CHECK (situacion IN ('vigente','devuelto')));
CREATE TABLE solicitudes_cancelacion (id uuid PRIMARY KEY, folio_id uuid NOT NULL REFERENCES folios, motivo text NOT NULL CHECK (length(motivo) >= 10),
  solicita_usuario_id uuid NOT NULL REFERENCES usuarios, fecha_solicitud timestamptz DEFAULT now(), resultado text CHECK (resultado IN ('aprobada','rechazada')),
  resuelve_usuario_id uuid REFERENCES usuarios, fecha_resolucion timestamptz);
CREATE TABLE conciliaciones (id uuid PRIMARY KEY, deposito_id uuid REFERENCES depositos, categoria text, fecha_corte date NOT NULL,
  responsables text NOT NULL, estado text CHECK (estado IN ('abierta','cerrada')));
CREATE TABLE conciliacion_partidas (id bigserial PRIMARY KEY, conciliacion_id uuid REFERENCES conciliaciones, tipo_bien_id int, arma_id uuid,
  existencia_fisica int, existencia_documental int, diferencia int GENERATED ALWAYS AS (existencia_fisica - existencia_documental) STORED,
  aclaracion text, ajuste_folio_id uuid REFERENCES folios);
CREATE TABLE ajustes_autorizados (folio_id uuid PRIMARY KEY REFERENCES folios, conciliacion_id uuid REFERENCES conciliaciones, justificacion text NOT NULL);
CREATE TABLE evidencias (id uuid PRIMARY KEY, folio_id uuid REFERENCES folios, nombre_archivo text, hash_sha256 text NOT NULL, ruta text, subido_por uuid REFERENCES usuarios, fecha timestamptz DEFAULT now());
CREATE TABLE auditoria (id bigserial PRIMARY KEY, fecha timestamptz DEFAULT now(), usuario_id uuid REFERENCES usuarios, accion text NOT NULL, entidad text, entidad_id text, detalle jsonb, ip inet);
