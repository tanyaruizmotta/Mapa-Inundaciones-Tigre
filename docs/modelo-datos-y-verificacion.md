# Modelo de datos y verificación

Diseño de la futura conexión con Supabase. La migración en `supabase/migrations/` es un borrador local y todavía no se aplicó a ningún proyecto. Los datos de `src/data/` siguen siendo ejemplos locales y no deben cargarse como antecedentes reales.

## Criterios

- Separar eventos históricos documentados de reportes ciudadanos recientes.
- Mostrar en el mapa público solo eventos revisados y aprobados.
- Guardar la fuente y la ubicación de cada evento; admitir campos desconocidos sin completar con suposiciones.
- No pedir nombre, teléfono, correo ni otros datos personales para enviar un reporte.
- No interpretar el número de reportes como una medida directa de riesgo: depende de cuánto y cómo se haya registrado en cada zona.

## Tablas propuestas

### `flood_events`

Contiene eventos históricos o actuales documentados y aprobados para el mapa.

| Campo | Tipo sugerido | Uso |
| --- | --- | --- |
| `id` | `uuid` | Clave primaria, generada por Supabase. |
| `locality` | `text` | Localidad o sector de Tigre. |
| `location_label` | `text` | Dirección, intersección o descripción legible; puede ser nula si no se conoce. |
| `latitude`, `longitude` | `double precision` | Coordenadas WGS84; ambas nulas si la ubicación no es suficientemente precisa. |
| `occurred_at` | `date` | Fecha del evento; nula si la fuente no permite determinarla. |
| `incident_type` | `text` | Por ejemplo, anegamiento pluvial o desborde; conservar la categoría de la fuente cuando sea posible. |
| `severity` | `text` | `low`, `moderate`, `high` o `unknown`; asignar solo con un criterio documentado. |
| `severity_basis` | `text` | Evidencia usada para asignar la intensidad, por ejemplo profundidad o duración reportada. |
| `verification_status` | `text` | `pending`, `verified` o `rejected`. Para el mapa público se exige `verified`. |
| `verified_at` | `timestamptz` | Momento de aprobación. |
| `verified_by` | `uuid` | Cuenta revisora que aprobó el registro. |
| `is_published` | `boolean` | Publicación explícita; por defecto `false`. |
| `review_note` | `text` | Nota interna breve; no se muestra en el mapa público. |
| `origin_report_id` | `uuid` | Reporte ciudadano que originó el registro; nulo si vino de otra fuente. |
| `created_at`, `updated_at` | `timestamptz` | Auditoría básica. |

### `event_sources`

Permite adjuntar una o más fuentes a un evento y comprobar la regla de evidencia.

| Campo | Tipo sugerido | Uso |
| --- | --- | --- |
| `id` | `uuid` | Clave primaria. |
| `event_id` | `uuid` | Evento respaldado. |
| `source_title` | `text` | Título del documento o página. |
| `source_url` | `text` | Enlace, si está disponible. |
| `publisher_key` | `text` | Identificador normalizado del organismo o editorial, para contar fuentes independientes. |
| `source_type` | `text` | `official`, `academic`, `media` u `other`. |
| `published_at` | `date` | Fecha de publicación, si se conoce. |
| `retrieved_at` | `timestamptz` | Cuándo se consultó la fuente. |
| `citation_note` | `text` | Nota breve de cita o evidencia relevante. |

### `puntos_demo`

Tabla para el dataset sintético del práctico. No se mezcla con `flood_events` y no utiliza el flujo de verificación histórica.

| Campo | Tipo sugerido | Uso |
| --- | --- | --- |
| `id` | `uuid` | Clave primaria, generada por Supabase. |
| `name`, `locality` | `text` | Nombre del punto y localidad de demostración. |
| `latitude`, `longitude` | `double precision` | Coordenadas sintéticas para probar el mapa. |
| `category` | `text` | `low`, `moderate` o `high`, derivada del valor artificial. |
| `value` | `integer` | Índice sintético de 0 a 100, sin unidad física. |
| `event_date` | `date` | Fecha ficticia del ejemplo. |
| `description` | `text` | Descripción del registro de prueba. |
| `is_demo` | `boolean` | Obligatoriamente `true`. |
| `source` | `text` | Identificador fijo `dataset_sintetico_poc`. |

La vista `map_demo_points` expone estas filas para la aplicación. La migración no carga los 30 registros: el CSV se importa por separado después de aplicarla.

### `citizen_reports`

Guarda envíos que todavía no constituyen antecedentes confirmados.

| Campo | Tipo sugerido | Uso |
| --- | --- | --- |
| `id` | `uuid` | Clave primaria. |
| `locality` | `text` | Localidad elegida en el formulario. |
| `location_label` | `text` | Calle o intersección informada. |
| `latitude`, `longitude` | `double precision` | Coordenadas opcionales; no pedir ubicación precisa del domicilio. |
| `incident_type` | `text` | Tipo de situación reportada. |
| `severity` | `text` | Intensidad percibida o `unknown`; no equivale a medición oficial. |
| `description` | `text` | Detalle opcional, con límite de longitud. |
| `status` | `text` | `pending`, `in_review`, `verified` o `rejected`. |
| `review_note` | `text` | Motivo interno de la decisión; nunca público. |
| `reviewed_at` | `timestamptz` | Momento de revisión. |
| `reviewed_by` | `uuid` | Cuenta revisora. |
| `created_at` | `timestamptz` | Momento de recepción. |

La relación `flood_events.origin_report_id` permite rastrear qué reporte dio origen a un evento confirmado. Debe tener una restricción `unique` para que un reporte no genere varios eventos por error.

## Flujo de revisión

1. El formulario crea un registro en `citizen_reports` con estado `pending`.
2. El reporte queda fuera del mapa público y la persona recibe una confirmación de que fue recibido, no de que esté verificado.
3. Una persona revisora busca duplicados y comprueba fecha, zona y evidencia. Puede consultar una fuente municipal, un documento público o más de una fuente independiente.
4. Si no hay respaldo suficiente, el reporte queda pendiente o se marca `rejected`, registrando el motivo internamente.
5. Se acepta evidencia si hay al menos una fuente oficial o dos fuentes de publicadores independientes. El sistema impide marcar como verificado un evento que no cumpla ese requisito.
6. Al confirmar, se crea un `flood_events` con fuentes, ubicación, fecha y criterio de intensidad; se enlaza el reporte de origen.
7. Una persona revisora publica explícitamente el evento. Solo se muestran registros verificados y publicados. La revisión no debe convertir una percepción de nivel de agua en una medición objetiva.

## Acceso y seguridad al conectar Supabase

- Visitantes: lectura de `map_demo_points` para la PoC sintética; los eventos reales se exponen únicamente mediante vistas que filtran registros verificados y publicados.
- Envío ciudadano: permitir crear un reporte pendiente, sin acceso de lectura a reportes de otras personas.
- Revisión: cambios de estado y notas internas solo para una cuenta revisora autenticada.
- La clave `service_role` no se incluye en React ni en variables `VITE_*`; las tareas privilegiadas se hacen en un entorno de servidor.
- Antes de abrir el formulario a internet, agregar límites contra spam y revisar si hace falta conservar reportes rechazados o eliminarlos pasado un plazo.

La migración exige evidencia al pasar un evento a `verified`, evita publicar eventos no verificados y bloquea cambios o borrado de fuentes mientras el evento siga verificado. El cliente público consulta vistas permitidas, no las tablas internas.

## Decisiones que mantenemos abiertas

- Si `locality` usará nombres de una capa territorial oficial o una lista de localidades editable.
- Cómo se definirá la intensidad y si corresponde mostrarla cuando la fuente no informa profundidad o duración.
- Cuánto tiempo se guardarán reportes pendientes y rechazados.

La primera versión puede implementarse sin una tabla de localidades: usar texto para la zona, y pasar a límites geográficos cuando tengamos una fuente territorial adecuada.
