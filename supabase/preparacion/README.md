# Preparación Supabase: episodios documentados

Este paquete es preparación local. **No se ejecutó ni se aplicó nada en Supabase.** No requiere PostGIS y no crea datos sintéticos ni niveles de riesgo.

## Archivos

- `preparar-investigacion.sql`: crea `public.documented_episodes` y `public.interest_sectors`, configura acceso de solo lectura, crea la vista `public.map_documented_episodes` y carga los 8 episodios y 15 sectores con upsert por ID. Es el archivo principal para aplicar desde Supabase SQL Editor.
- `episodios-documentados.csv`: los mismos ocho episodios, compatible con la tabla `documented_episodes`. Incluye los datos de fuente por mención en la columna JSON `source_mentions`.
- `sectores-interes.csv`: los mismos sectores, compatible con `interest_sectors`; mantiene vacías las coordenadas y geometrías.

El SQL ya incluye la carga de ambos CSV como `INSERT` idempotentes. Usá **el SQL o la importación CSV**, no ambos flujos en secuencia. Si aplicás el SQL completo, no hace falta subir los CSV.

## Aplicar en Supabase cuando decidan hacerlo

1. Abrí el proyecto correcto en Supabase y entrá en **SQL Editor**.
2. Creá una consulta nueva y pegá el contenido completo de `preparar-investigacion.sql` (o cargá el archivo en el editor).
3. Revisá que el proyecto y los nombres de tablas sean los esperados y ejecutá el script una vez.
4. En **Table Editor**, confirmá `documented_episodes` (8 filas), `interest_sectors` (15 filas) y la vista `map_documented_episodes`.
5. Comprobá que `longitude`, `latitude` y `geometry` sigan en `NULL` para todos estos registros.

Alternativa CSV: primero crear el esquema con el DDL de `preparar-investigacion.sql`, retirando/comentando sus `INSERT` de carga; luego importar cada CSV en su tabla homónima con la opción de encabezados. La columna `source_mentions` es JSON válido y debe asignarse a `jsonb`; no transformes celdas vacías de geometría/coordenadas en cero.

## Compatibilidad con la aplicación

`map_documented_episodes` expone fecha, localidades, barrios, descripción, coordenadas, geometría, evidencia, confianza documental y fuentes. React puede consultarla con Supabase JS; deck.gl solo debe recibir filas donde `longitude` y `latitude` no sean nulos. Las ocho filas actuales carecen de coordenadas, así que no aparecerán como marcadores.

La aplicación actual aún consulta `map_demo_points` y espera campos del prototipo sintético (`category` y `value`). No cambies esa consulta ni muestres estos registros como riesgo: cuando existan coordenadas verificadas, habrá que implementar un adaptador explícito para la vista documental y ajustar los indicadores para que no dependan del índice sintético.

`documentary_confidence` expresa la calidad documental agregada, no severidad o riesgo. Las fechas no precisas quedan SQL `NULL`; el texto `date_precision` conserva la explicación. `geometry` es `jsonb` y SQL `NULL`, no PostGIS.
