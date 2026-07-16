# Iconos locales

Todos los iconos personalizados de la app deben vivir en este directorio y deben provenir de SVGRepo, salvo que el manifiesto indique explicitamente que el origen no pudo confirmarse.

## Reglas

- No cargar iconos desde internet en runtime.
- No dibujar iconos con `View`, `Text`, Unicode, bordes o geometria manual.
- No reemplazar un enlace solicitado por otro recurso.
- Verificar licencia antes de importar.
- Mantener estilo consistente dentro de una misma pantalla.

## Importar un icono de SVGRepo

```bash
npm run icon:import -- \
  --url "https://www.svgrepo.com/svg/<id>/<slug>" \
  --name "nombre-semantico" \
  --category "actions" \
  --style "outline" \
  --license "CC0 License" \
  --originalName "Nombre SVG Vector"
```

Categorias actuales:

- `actions`
- `entities`
- `navigation`
- `status`

El importador descarga el SVG desde SVGRepo, lo limpia, lo guarda localmente, actualiza `manifest.ts` y regenera `registry.js` para uso de la app.
