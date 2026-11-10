# Mapa de Inundaciones de Tigre

**Entrega académica — ISFT**

**Tipo de proyecto:** prueba de concepto (PoC) web

**Estado:** prototipo funcional desplegado en producción para consultar antecedentes históricos documentados

## 1. Objetivo y problema

El proyecto explora una forma de reunir y consultar antecedentes de inundaciones mencionados en fuentes públicas para el partido de Tigre, provincia de Buenos Aires. La información disponible está distribuida entre noticias, publicaciones municipales y otros documentos; además, las fuentes no siempre indican la misma precisión de fecha o ubicación.

La PoC permite consultar los episodios junto con sus fuentes y mostrar qué se conoce —y qué no— sobre cada ubicación. No es un sistema de alertas, una evaluación de riesgo actual ni un inventario exhaustivo de inundaciones.

## 2. Prueba de concepto

La aplicación conserva un mapa base de OpenStreetMap y ofrece un registro de antecedentes documentales con fecha y precisión de fecha, localidades, barrios o sectores, descripción, evidencia, confianza documental y menciones a fuentes. Permite filtrar los registros por localidad y sector.

El conjunto consolidado contiene **8 episodios documentales**, provenientes de **17 menciones** agrupadas cuando correspondían al mismo temporal. La preparación de datos también incluye **15 sectores de interés**. Estos conteos describen el conjunto investigado, no la frecuencia ni la severidad de inundaciones en cada barrio.

El mapa no dibuja los episodios actuales porque no cuentan con coordenadas verificadas. La aplicación incluye además un planificador ilustrativo y un formulario de demostración: sus ejemplos son ficticios, locales a la sesión y no se envían a Supabase ni se incorporan al registro histórico.

## 3. Tecnologías

| Tecnología | Uso en el proyecto |
| --- | --- |
| React 19 | Interfaz y componentes de la aplicación. |
| Vite 7 | Desarrollo local y compilación de archivos estáticos. |
| deck.gl 9 | Integración del lienzo de visualización con la interfaz. Actualmente no se cargan capas de episodios. |
| MapLibre GL 6 | Renderizado del mapa base, mediante `react-map-gl`. |
| Supabase | Consulta de la vista documental mediante `@supabase/supabase-js`. |
| Vercel | Plataforma utilizada para desplegar la aplicación compilada en producción. |

## 4. Arquitectura y flujo de datos

1. Vite sirve la aplicación React durante el desarrollo y genera el sitio estático en `dist/`, que se despliega en Vercel.
2. `src/lib/supabaseClient.js` inicializa el cliente con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. `src/lib/floodEvents.js` lee los campos documentales desde `map_documented_episodes` y conserva las coordenadas nulas.
4. `src/App.jsx` presenta los episodios en una sección histórica y sus fuentes en cada ficha. Los filtros se aplican en el navegador.
5. deck.gl contiene el mapa base de MapLibre/OpenStreetMap. Las capas de eventos están vacías; si en el futuro se incorporan ubicaciones verificadas, primero deberá validarse su geometría.

La clave publicable se configura localmente en `.env.local` o como variable de entorno del servicio de publicación. No se debe colocar una contraseña, una clave `service_role` ni otra clave secreta en el frontend o en variables `VITE_*`. `.env.local` está excluido por `.gitignore`; `.env.example` contiene solamente marcadores de ejemplo.

## 5. Modelo de datos de Supabase

El archivo `supabase/preparacion/preparar-investigacion.sql` describe el esquema usado por el registro documental:

- **`documented_episodes`**: episodios consolidados. Guarda identificador, fecha nullable y su precisión, localidades, barrios, descripción y precisión geográfica, coordenadas y geometría opcionales, tipo de evento, resumen de evidencia, confianza documental y `source_mentions` como un arreglo JSON con las menciones y sus fuentes. Las restricciones validan el par de coordenadas y sus rangos; la confianza aceptada es `alta`, `media`, `baja` o `mixta`.
- **`interest_sectors`**: sectores derivados de las menciones. Guarda localidad, barrio, tipo y descripción del sector, precisión de ubicación, coordenadas/geometría opcionales y referencias a episodios y menciones. No representa polígonos barriales ni niveles de riesgo.
- **`map_documented_episodes`**: vista de lectura que expone los campos de `documented_episodes` para la aplicación. La consulta de lectura del proyecto se dirige a esta vista; el acceso no implica permisos para modificar las tablas.

El script configura políticas de lectura para `anon` y `authenticated`. En el entorno conectado, la vista respondió con los 8 episodios preparados. La migración `supabase/migrations/20261108000000_initial_schema.sql` es un diseño anterior separado: define, entre otras, tablas de reportes, eventos, fuentes y puntos de demostración, junto con otras vistas. No es el origen de los antecedentes que consume la interfaz actual.

## 6. Fuentes y metodología de investigación

El relevamiento conservado en `data/investigacion/fuentes.md` consultó fuentes municipales y provinciales, informes y noticias locales. Entre las fuentes periodísticas aparecen Clarín Zonal Tigre, Tiempo Argentino, Agencia Popular, La Arena/Télam, La Nación y Todo Pacheco; entre las institucionales, el Municipio de Tigre y documentos de organismos provinciales. Las referencias, enlaces y limitaciones particulares se detallan en ese archivo y en `source_mentions`.

El procedimiento fue registrar las menciones originales en `inundaciones-tigre.csv`, compararlas por fecha, temporal y sectores citados, y consolidar menciones del mismo episodio en `eventos-consolidados.csv` y `supabase/preparacion/episodios-documentados.csv`. Se conservaron identificadores de menciones y enlaces a sus fuentes. Cuando la fecha de publicación no permite conocer el día del evento, la fecha se deja nula o se aclara su precisión; las obras preventivas y las descripciones de riesgo potencial no se cuentan como inundaciones ocurridas.

Para el contexto geográfico se revisaron GeoRef, IGN, ARBA, INDEC y referencias provinciales. La revisión no obtuvo coordenadas verificables para los sectores afectados ni límites oficiales de los barrios mencionados. Por esa razón, `eventos-sin-geometria.geojson` conserva ocho entidades con geometría `null`; los nombres de calles y barrios quedan como descripción, no como puntos exactos.

La confianza documental expresa la calidad y consistencia del respaldo consultado. No mide altura del agua, severidad física, frecuencia ni riesgo.

## 7. Limitaciones y alcance

- Ninguno de los ocho episodios consolidados tiene coordenadas verificadas; las coordenadas y geometrías se mantienen en `NULL`. No se dibujan puntos ni polígonos inferidos.
- Las fuentes no forman una serie completa ni sistemática. No permiten comparar barrios ni afirmar cuál tiene mayor riesgo o frecuencia.
- Las fechas y ubicaciones tienen distinta precisión; cada registro conserva las aclaraciones disponibles.
- Los 30 puntos del archivo `src/data/dataset-demo-inundaciones-tigre.csv` son sintéticos. Están separados de los antecedentes documentados y no se usan como prueba de inundaciones reales ni como medición de riesgo.
- El mapa muestra cartografía base y no representa riesgo actual, pronósticos, zonas de evacuación ni condiciones de transitabilidad.
- El proyecto está desplegado en producción en Vercel. Según la verificación realizada por el equipo, la URL pública muestra el mapa base y los 8 antecedentes documentales.

## 8. Ejecución local

Se requiere Node.js 20.19 o superior (o 22.12 o superior) y npm.

```
npm install
Copy-Item .env.example .env.local
```

Completar localmente `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env.local` con la URL del proyecto Supabase y su clave **publicable**. No incluir credenciales secretas.

```
npm run dev
```

Para generar y revisar la compilación de producción:

```arduino
npm run build
npm run preview
```

La aplicación necesita que `map_documented_episodes` exista y permita lectura al rol público correspondiente. Sin esas variables o permisos, no podrá cargar los episodios desde Supabase.
## 9. Enlaces

- **Aplicación:** [https://mapa-inundaciones-tigre.vercel.app/](https://mapa-inundaciones-tigre.vercel.app/)
- **Repositorio:** [https://github.com/tanyaruizmotta/Mapa-Inundaciones-Tigre](https://github.com/tanyaruizmotta/Mapa-Inundaciones-Tigre)

## Archivos de referencia

- Investigación original: `data/investigacion/inundaciones-tigre.csv`.
- Episodios consolidados: `data/investigacion/eventos-consolidados.csv`.
- GeoJSON sin geometrías: `data/investigacion/eventos-sin-geometria.geojson`.
- Fuentes y limitaciones: `data/investigacion/fuentes.md`.
- Esquema y carga documental: `supabase/preparacion/preparar-investigacion.sql`.
