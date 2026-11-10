# Mapa de Inundaciones de Tigre

Aplicación académica en desarrollo para explorar antecedentes de inundaciones en el partido de Tigre, Buenos Aires.

La interfaz consulta episodios históricos documentados desde la vista `map_documented_episodes` de Supabase y los presenta en un registro con fuentes y precisión geográfica. El mapa conserva la cartografía base de OpenStreetMap, pero solo dibujará episodios que tengan coordenadas verificadas. También incluye un planificador ilustrativo y un formulario de reportes ficticios que permanece separado de los antecedentes.

**Aviso sobre los datos:** `src/data/dataset-demo-inundaciones-tigre.csv` y `src/data/demoEvents.js` son datos sintéticos heredados para pruebas y no se usan para representar los antecedentes históricos. Los reportes del formulario son ejemplos locales, se guardan solo en la memoria del navegador y no se envían a ningún servicio. La aplicación no asigna riesgo ni crea coordenadas; los episodios sin latitud y longitud quedan fuera del mapa.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Desarrollo local

```sh
npm install
npm run dev
```

Para generar y previsualizar una compilación:

```sh
npm run build
npm run preview
```

## Configuración de Supabase

`src/lib/supabaseClient.js` inicializa el SDK solo cuando existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Copiá `.env.example` a `.env.local` y completá esos valores con la URL del proyecto y una clave publicable/anon. El cliente consulta `map_documented_episodes`, preparada por `supabase/preparacion/preparar-investigacion.sql`. Esa vista debe existir y tener permisos de lectura en Supabase. No incluyas una clave `service_role` ni otra clave secreta en variables `VITE_*` o en el frontend.

## Estructura

- `src/App.jsx`: mapa base, registro histórico documental, planificador y formulario de demostración local.
- `src/data/dataset-demo-inundaciones-tigre.csv`: dataset sintético de 30 puntos; se puede importar como CSV en Supabase.
- `src/data/demoEvents.js`: lector que convierte el CSV al formato que usa el mapa.
- `src/lib/floodEvents.js`: consulta `map_documented_episodes` y conserva las coordenadas nulas.
- `src/data/demoReports.js`: reportes inventados de ejemplo.
- `src/data/neighborhoods.js`: opciones de localidades del formulario.
- `src/lib/supabaseClient.js`: cliente que se activa solo si están configuradas las variables.
- `.env.example`: nombres de variables requeridas, sin credenciales reales.
- `docs/modelo-datos-y-verificacion.md`: propuesta de tablas y flujo de revisión.
- `docs/descripcion-entrega.md`: descripción de cinco líneas para el práctico.
- `docs/publicacion-vercel.md`: pasos para publicar después de cargar el dataset.
- `supabase/migrations/20261108000000_initial_schema.sql`: borrador SQL local, aún no aplicado a Supabase.
- `supabase/seed-demo-points.sql`: carga idempotente de los 30 puntos sintéticos desde el CSV.
- `supabase/preparacion/preparar-investigacion.sql`: preparación local de tablas, vista y carga de episodios documentados; aplicar solo cuando se decida configurar Supabase.
- `src/main.jsx`: punto de entrada de React.
- `src/styles.css`: estilos de la interfaz.
- `index.html`: documento raíz.
- `vite.config.js`: configuración de Vite.

La vista de antecedentes contiene fecha, fecha de precisión, localidades, barrios, descripción, confianza documental, evidencia, menciones de fuentes y coordenadas opcionales. La confianza expresa respaldo documental, no intensidad o nivel de riesgo. Actualmente los episodios investigados no tienen coordenadas verificadas; por eso el mapa no dibuja marcadores.
