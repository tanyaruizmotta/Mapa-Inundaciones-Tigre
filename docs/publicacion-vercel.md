# Preparación para Vercel

La aplicación no se publicó. Cuando la tabla `puntos_demo` y la vista `map_demo_points` estén creadas y cargadas en Supabase, la publicación puede hacerse así:

1. Subir el código del proyecto a un repositorio Git, excluyendo `.env.local`, `node_modules/` y `dist/`.
2. En Vercel, importar ese repositorio y mantener la configuración detectada para Vite.
3. Configurar las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en los entornos de Preview y Production.
4. Desplegar y comprobar que la página carga los puntos desde `map_demo_points`, no desde el CSV local.
5. Abrir la URL publicada desde otro dispositivo y guardar una captura del tablero para la entrega.

Comandos de compilación: `npm run build`. Carpeta de salida: `dist`.

No agregar una clave `service_role` o una secret key a las variables `VITE_*`.
