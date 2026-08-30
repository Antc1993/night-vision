---
name: night-vision-tools
description: Guía arquitectónica, patrones y reglas de desarrollo para crear y mantener herramientas de dibujo (Tools) en NightVision Charts.
---

# Guía para Desarrollo y Mantenimiento de Herramientas (Tools) en NightVision

Esta guía documenta la arquitectura interactiva, el ciclo de vida de los eventos y las reglas críticas para construir y modificar herramientas de dibujo en **NightVision Charts** sin provocar regresiones.

---

## 1. Arquitectura de una Herramienta de Dibujo

Cada herramienta consta de 3 capas esenciales:

```
┌────────────────────────────────────────────────────────┐
│  1. Interfaz de Usuario                                │
│     DrawingToolbar.svelte (Activar herramienta)        │
│     FloatingToolbar.svelte (Opciones, estilo y texto)  │
└───────────────────────┬────────────────────────────────┘
                        │ $events.emit('tool-<nombre>')
                        ▼
┌────────────────────────────────────────────────────────┐
│  2. Script Overlay (.navy) en src/scripts/tools/       │
│     LineTool.navy, RectTool.navy, TextTool.navy,       │
│     PositionTool.navy,                                 │
│     FibonacciRetracementTool.navy, MeasureTool.navy... │
│     - Mantiene colección de objetos en $core.dataExt   │
│     - Escucha eventos calificados con $core.uuid       │
│     - Gestiona mousedown, mousemove, keydown           │
└───────────────────────┬────────────────────────────────┘
                        │ Instancia primitivo interactivo
                        ▼
┌────────────────────────────────────────────────────────┐
│  3. Primitivo en src/core/primitives/navyLib/          │
│     trendLine.js, rectangle.js, textAnnotation.js,     │
│     positionTool.js, verticalLine.js...                │
│     - Maneja pines interactivos (Pin.js)               │
│     - Dibuja trazos, fondos, pines y texto centrado    │
│     - Calcula colisión geométrica con el ratón         │
└────────────────────────────────────────────────────────┘
```

---

## 2. Ciclo de Vida del Trazo (State Machine de Pines)

### Herramientas de 2 Clics (Línea de tendencia, Rectángulo, Fibonacci, Regla)
1. **Selección**: El usuario presiona el botón en la barra. Se emite `tool-<nombre>` -> el overlay activa `startDrawTool = true`.
2. **Primer Clic (`mousedown`)**:
   - `startDrawTool` es `true`.
   - Se crea el objeto con `p1 = [t, $]` y `p2 = [t, $]`.
   - Se crea el primitivo con `nw = true`.
   - `Pin 1` queda en estado `'settled'`.
   - `Pin 2` queda en estado `'tracking'` (`isDrawing = true`).
   - Se emite `$events.emit('tool-started', $core.uuid)` para que los otros paneles cancelen `startDrawTool`.
   - Se emite `$events.emit('scroll-lock', true)` para bloquear el scroll del gráfico.
   - `startDrawTool` pasa a `false`.
3. **Movimiento del ratón (`mousemove`)**:
   - Durante `isDrawing`, el pin en `'tracking'` actualiza sus coordenadas en tiempo real (`update()`) con las del cursor.
   - En rectángulos, debe llamarse a `this.update()` y `this.updateRect()` para sincronizar los pines auxiliares (`p3`, `p4`).
4. **Segundo Clic (`mousedown`)**:
   - El overlay detecta `drawingTool = Object.values(tools).find(x => x.isDrawing || x.pins.some(p => p.state === 'tracking'))`.
   - Llama a `drawingTool.mousedown(event)`.
   - El pin en `'tracking'` pasa a `'settled'`.
   - `isDrawing` pasa a `false`.
   - Se emite `$events.emit('scroll-lock', false)` -> La barra lateral vuelve automáticamente al puntero (`crosshair`).
   - Se llama a `this.onSelect(this.data.uuid)`.

### Herramientas de 1 Clic (Línea Horizontal, Rayo / Semirrecta Horizontal)
1. Al hacer el primer clic, se fija `p1 = [t, $]`.
2. No tiene `Pin 2` (o queda inmediatamente en `'settled'`).
3. `isDrawing = false` de inmediato.
4. Se emite `$events.emit('scroll-lock', false)` de inmediato.

---

## 3. Reglas Críticas para Evitar Errores

### ⚠️ Regla 1: Aislamiento por `$core.uuid` en Listeners
- **NUNCA** registres eventos globales compartidos sin prefijo si son específicos de la instancia del overlay.
- Usa siempre `$core.uuid`:
  ```javascript
  $events.on($core.uuid + ':update-settings', data => { ... })
  $events.on($core.uuid + ':delete-tool', uuid => { ... })
  $events.on($core.uuid + ':selection-event', data => { ... })
  $events.on($core.uuid + ':tool-started', activeUuid => {
      if (activeUuid !== $core.uuid) startDrawTool = false
  })
  ```

### ⚠️ Regla 2: Coordenadas Seguras en `Pin.update()`
- No asumas que `$core.cursor.time` siempre está definido (por ejemplo, en zonas futuras fuera de las velas).
- Usa fallback a `ti` o a la función de layout:
  ```javascript
  let cursorTime = this.core.cursor.time !== undefined ? this.core.cursor.time : this.core.cursor.ti
  if (cursorTime === undefined && layout && layout.x2t) {
      cursorTime = layout.x2t(this.core.cursor.x)
  }
  ```

### ⚠️ Regla 3: Persistencia Completa del Texto
- Al actualizar ajustes (`update-settings`), persiste `text` tanto en el objeto en memoria como en `dataExt`:
  ```javascript
  if (text !== undefined) {
      tool.data.text = text
      if (tool.data.settings) tool.data.settings.text = text
  }
  ```

### ⚠️ Regla 4: Renderizado de Texto Centrado
- Calcula siempre el punto medio geométrico `(midX, midY)`.
- Dibuja un badge de fondo semitransparente con `roundRect` y borde con el color de la figura:
  ```javascript
  ctx.save()
  ctx.font = '12px Inter, -apple-system, sans-serif'
  const metrics = ctx.measureText(text)
  const boxWidth = metrics.width + 16
  const boxHeight = 20
  ctx.fillStyle = 'rgba(18, 22, 34, 0.9)'
  ctx.strokeStyle = sett.color || '#33ff33'
  ctx.beginPath()
  ctx.roundRect(midX - boxWidth/2, midY - boxHeight/2, boxWidth, boxHeight, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, midX, midY)
  ctx.restore()
  ```

---

## 4. Plantilla para Crear una Nueva Herramienta

1. **Crear Primitivo en `src/core/primitives/navyLib/<MiTool>.js`**:
   - Constructor recibe `(core, data, nw = false)`.
   - Inicializa `this.pins = [ new core.lib.Pin(core, this, 'p1'), ... ]`.
   - Implementa `draw(ctx)`, `collision(x, y)`, `drawText(ctx, text, sett)`.
2. **Exportar en `src/core/navy/overlayEnv.js`**:
   - Importar `<MiTool>` y agregarlo a `this.lib`.
3. **Crear Overlay en `src/scripts/tools/<MiToolTool>.navy`**:
   - Manejar colección `tools = {}`.
   - Escuchar `$core.uuid + ':tool-<nombre>'`, `$core.uuid + ':update-settings'`, `$core.uuid + ':delete-tool'`.
4. **Agregar a `DEFAULT_TOOLS` en `src/core/dataHub.js`**:
   - Asegura la auto-inyección en todos los paneles.
5. **Integrar en `DrawingToolbar.svelte` y `FloatingToolbar.svelte`**:
   - Botón en toolbar y componente de estilo en modal.
