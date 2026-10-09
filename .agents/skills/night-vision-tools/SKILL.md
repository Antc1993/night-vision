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

### Herramientas de 3 Clics (Triángulo, Canales Paralelos)
1. **Clic 1**: Se fija `p1` (`settled`), `p2` entra en `'tracking'`. `this.step = 2`, `isDrawing = true`, `scroll-lock = true`.
2. **Clic 2**: `p2` pasa a `'settled'`, `p3` entra en `'tracking'` (`this.step = 3`). Se previsualiza la figura completa en tiempo real.
3. **Clic 3**: `p3` pasa a `'settled'`, `isDrawing = false`, `scroll-lock = false`. Se activa la selección del objeto.

### Herramientas de N Clics (Polilínea / Path)
1. **Clic 1**: Crea el trazo con `p0` (`settled`) y `p1` (`tracking`).
2. **Clics subsiguientes ($2 \dots N$)**: Cada clic asienta el pin actual y añade un nuevo pin en `'tracking'`.
3. **Finalización**:
   - **Tecla Enter o Escape**: Finaliza el trazo con los puntos fijados.
   - **Doble Clic (`dblclick`)**: Asienta el último vértice y concluye el dibujo.
   - **Clic cerca del origen ($P_0$)**: Cierra el contorno (`closed = true`) formando un polígono cerrado.
   - Al finalizar, `isDrawing = false` y se libera el `scroll-lock`.

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

### ⚠️ Regla 2: Coordenadas de Tiempo Seguras y Prevención de Marca Temporal `null`
- **NUNCA** uses solamente `cursor.time !== undefined`, porque `cursor.time` puede ser explícitamente `null`. Si es `null`, `null !== undefined` es `true` y se guarda `null`.
- Al cambiar de timeframe o recrear la vista, `layout.time2x(null)` evalúa `null` como `0` (1 de enero de 1970) y proyecta los puntos a millones de píxeles fuera de la pantalla (el dibujo "desaparece").
- **Patrón obligatorio**:
  ```javascript
  const x2tFn = layout ? (layout.x2time || layout.x2t) : null
  let t = (cursor.time != null && !isNaN(cursor.time)) ? cursor.time : cursor.ti
  if ((t == null || isNaN(t)) && x2tFn) {
      t = x2tFn.call(layout, cx)
  }
  ```

### ⚠️ Regla 3: Coordenadas Y Seguras con Respaldo de Ratón
- No asumas que `cursor.y` siempre existe (en clicks rápidos o iniciales puede ser `undefined`, arrojando `layout.y2value(undefined) === NaN`).
- Resuelve siempre `cx` y `cy` con fallback a `mouse`:
  ```javascript
  const cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
  const cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)
  let $ = layout && layout.y2value ? layout.y2value(cy) : 0
  ```

### ⚠️ Regla 4: Persistencia Completa del Texto y Propiedades
- Al actualizar ajustes (`update-settings`), persiste `text` tanto en el objeto en memoria como en `dataExt`:
  ```javascript
  if (text !== undefined) {
      tool.data.text = text
      if (tool.data.settings) tool.data.settings.text = text
  }
  ```

### ⚠️ Regla 5: Renderizado de Texto Centrado
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

### ⚠️ Regla 6: Cuidado con Redeclaraciones en Scripts Navy (.navy)
- En archivos `.navy`, las funciones se compilan dinámicamente mediante `new Function(...)` dentro de un mismo scope contenedor.
- **NUNCA** redeclares variables con `const` o `let` en el mismo ámbito (por ejemplo, declarar dos veces `const layout = $core.layout` dentro de `newPosition()`).
- Una redeclaración lanza `SyntaxError: Identifier 'layout' has already been declared`, lo cual detiene el parseo de ese overlay y de los que siguen en la lista.

### ⚠️ Regla 7: Limpieza Estricta de Listeners y Evitar Doble Clic ("Segundo punto cae en el primero")
- Si el segundo punto de un trazo colapsa instantáneamente en el primer punto al hacer clic una sola vez, suele deberse a listeners duplicados de `mousedown` en el `<canvas>`.
- Al desvincular eventos DOM en `Pointer.destroy()`, siempre asegúrate de usar `this.canvas.removeEventListener(...)` para evitar excepciones de tipo `Illegal invocation`.
- En componentes que montan y desmontan grids al cambiar de timeframe (`Grid.svelte`, `Canvas.svelte`), destruye explícitamente cualquier instancia previa de `input/pointer` antes de inicializar una nueva.

### ⚠️ Regla 8: Doble Clic para Abrir Modal de Opciones (`openSettings`)
- Para permitir abrir el modal de opciones (`FloatingToolbar.svelte`) al hacer doble clic sobre cualquier herramienta (en el mismo punto donde se arrastran las líneas o el cuerpo):
  1. **Pipeline de Eventos DOM**:
     - `pointer.js` propaga `'dblclick'` a través de `Grid.svelte` hacia las capas (`layers`) en orden inverso (`layers.slice().reverse()`).
     - `parserOv.js` define el stub `var dblclick = null` y exporta `dblclick` en el objeto overlay retornado.
  2. **Detección en Primitivo y Overlay**:
     - En el primitivo (`navyLib`), en `mousedown(event)` detectar si `event && event.detail === 2`: pasar `isDbl` a `onSelect(uuid, isDbl)` y hacer `return` para evitar iniciar arrastre accidental (`this.isDragging = true`).
     - Implementar `dblclick(event)` tanto en el primitivo como en el overlay `.navy`: evaluar `collision() || pins.some(p => p.hover())` y llamar a `toolSelected(uuid, true)`.
  3. **Recepción en `FloatingToolbar.svelte`**:
     - En `onSelection(data)`: si `data.openSettings === true`, activar `settingsOpen = true`, `activeTab = "style"` y centrar `modalX` / `modalY`.

### ⚠️ Regla 9: Prevención de Colisiones y Bloqueo de Dibujos Subyacentes (`isDrawingMode`)
- **Problema**: Al hacer clic para colocar el punto 1 o punto 2/3 de un dibujo, si el cursor está sobre otro dibujo ya trazado previamente en el gráfico, la propagación secuencial de capas en `Grid.svelte` hacía que el dibujo subyacente detectara `collision()`, iniciara arrastre (`isDragging = true`) o marcara `event.__toolCaptured = true`, bloqueando el asentamiento del nuevo punto y moviendo la figura anterior.
- **Solución Arquitectónica (`dataHub.js`)**:
  1. **Estado Global en Hub**:
     - `hub.drawingTool`: tipo de herramienta actualmente armada desde la barra (e.g. `'line'`, `'rectangle'`, etc.) o `null` al desarmar/seleccionar cursor.
     - `hub.drawingInProgress`: booleano que indica si hay un dibujo activo entre el punto 1 y su conclusión.
     - `hub.isDrawingMode()`: retorna `!!(this.drawingTool || this.drawingInProgress)`.
  2. **Bloqueo en Pines Asentados y Primitivos**:
     - En `Pin.js`, si `this.state === 'settled'` y `hub.isDrawingMode()` es `true`, `mousedown()` y `mousemove()` retornan de inmediato sin modificar el cursor ni iniciar arrastre.
     - Al asentar un pin en tracking, se usa `trackingPin.mousedown(event, true)` (`force = true`) para garantizar que se asiente independientemente de flags de eventos.
     - Todos los primitivos en `navyLib` comprueban `isDrawingMode()` en `mousedown`, `mousemove` y `dblclick`.
  3. **Control en Overlays (`.navy`)**:
     - En `new*()`: emitir `$events.emit('hub:set-drawing-in-progress', true)` (o `false` para herramientas de 1 clic) y marcar `event.__toolCaptured = true`.
     - En `mousedown()`:
       - Si la herramienta está armada (`startDrawTool`), crear la figura y marcar `event.__toolCaptured = true`.
       - Si hay un trazo en progreso (`isDrawing`), asentar el punto y marcar `event.__toolCaptured = true`.
       - Si `hub.isDrawingMode()` es `true`, **retornar inmediatamente** para no interferir con la herramienta activa.
     - En `keydown()`: si se presiona `Escape`, limpiar el trazo en progreso, liberar el `scroll-lock` y emitir `hub:set-drawing-in-progress: false` y `hub:set-drawing-tool: null`.

### ⚠️ Regla 10: Acceso a Velas en Herramientas de Medición / Rango (`getCandles`)
- **Problema**: Dentro del contexto de un overlay de dibujo (`MeasureTool`), `$core.dataSubset` y `$core.data` corresponden a la propia herramienta de dibujo (donde residen los objetos de dibujo o arrays vacíos), **nunca** a las velas del gráfico principal. Intentar leer `this.core.dataSubset` para contar barras o sumar volumen siempre retornará un array vacío, dejando el conteo clavado en 1 barra o 0 volumen.
- **Solución**:
  - Obtener las velas reales a través del hub: `this.core.hub?.mainOv?.data` (o buscando overlays con `ov.main === true` o tipo que contenga `'candle'` en `hub.chart.overlays` y `hub.data.panes`).
  - Utilizar búsqueda binaria (`findNearestIndex`) $O(\log N)$ para ubicar `idx1` y `idx2` correspondientes a `minT` y `maxT`.
  - Conteo inclusivo de barras: `barsCount = (idx2 - idx1) + 1` (más extrapolación si el rango sobrepasa los límites del dataset hacia el pasado o futuro).
  - Si se arrastra hacia la izquierda (`p2[0] < p1[0]`), mostrar valores negativos (`-15 barras, -1h 15m`) siguiendo el estándar TradingView.

### ⚠️ Regla 11: Geometría de Herramientas Curvas y Arcos de 3 Puntos (Fórmula Maestra)
Para cualquier primitiva curva donde el tercer punto ($P_3$) defina la curvatura en el punto medio respecto a los extremos ($P_1, P_2$):

1. **Cálculo de Geometría en Pantalla (`getGeometry`) - Proyección Ortogonal Limpia**:
   - Calcular punto medio en pantalla: $M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$.
   - Vector cuerda y longitud: $\vec{d} = (dx, dy) = (x_2 - x_1, y_2 - y_1)$, $L = \text{hypot}(dx, dy)$.
   - Vector normal unitario perpendicular en pantalla: $\hat{n} = \left(-\frac{dy}{L}, \frac{dx}{L}\right)$.
   - Proyectar la posición de datos del punto 3 a pantalla: $x_{3, raw} = \text{layout.time2x}(p_3.t)$, $y_{3, raw} = \text{layout.value2y}(p_3.y\$)$.
   - Obtener la distancia perpendicular con signo $h$:
     $$\vec{v} = (x_{3, raw} - M_x, y_{3, raw} - M_y)$$
     $$h = \vec{v} \cdot \hat{n}$$
   - Posicionar el punto 3 en pantalla estrictamente perpendicular en la mitad del arco:
     $$P_3 = (x_3, y_3) = M + h \cdot \hat{n}$$
   - Punto de control de Bézier cuadrático ($u = 0.5 \implies B(0.5) = P_3$):
     $$Q = 2 P_3 - M \implies Q_x = 2 x_3 - M_x, \quad Q_y = 2 y_3 - M_y$$

2. **Regla Crítica: Inmutabilidad en `getGeometry` (Prevención de Feedback Loop de Crecimiento)**:
   - **NUNCA sobreescribir `p3.t` ni `p3.y$` dentro de `getGeometry()`**.
   - Si se mutan las coordenadas de datos en cada frame a partir de $(x_3, y_3)$, la discretización temporal/flotante de `layout.x2time` retroalimenta $h$ en un bucle positivo, causando que el arco se agrande continuamente al mover el mouse.
   - $(p_3.t, p_3.y\$)$ **SOLO** se actualizan en eventos de interacción directa del usuario (`updatePin3` al arrastrar el punto 3 o `updatePin3FromCurvature` al arrastrar $P_1/P_2$).

3. **Prevención de Saltos ("Teletransportación") al Hacer Clic (`mousedown`)**:
   - **NO condicionar el cálculo de $(x_3, y_3)$ al estado de arrastre** (ej. evitar bifurcaciones como `if (!isDraggingPin3)`).
   - Cuando el usuario hace clic sobre el pin, su estado pasa a `dragging` antes de que se mueva el ratón. Si el cálculo depende de esa bandera, el punto saltará en el instante de presionar el botón. Al usar la proyección ortogonal uniforme, la posición es idéntica en reposo y en arrastre.

4. **Anclaje de `Pin 3` a la Mitad del Arco**:
   - Por defecto, la clase `Pin` dibuja y detecta colisiones proyectando `this.t` y `this.y$`. Para un pin dependiente como $P_3$, se deben sobreescribir `draw_circle(ctx)` y `hover()` en `this.pins[2]` para que utilicen directamente `this.pins[2].x` y `this.pins[2].y` asignados desde $(geo.x_3, geo.y_3)$ (con fallback a `getGeometry()` si aún no están inicializados).
   - Esto asegura que la bolita del Pin 3 se dibuje **exactamente en la mitad física de la curva** ($u = 0.5$) en todo momento y no flote fuera del arco durante el zoom.

5. **Interacciones de Arrastre**:
   - **Al mover $P_3$ (`updatePin3`)**: proyectar el cursor sobre $\hat{n}$, calcular el nuevo $h = (cursor - M) \cdot \hat{n}$, actualizar `p3.t = layout.x2time(x3)` y `p3.y$ = layout.y2value(y3)`.
   - **Al mover $P_1$ o $P_2$ (`updatePin3FromCurvature`)**: mantener la distancia fija $h = \text{curvatureDist}$ a lo largo de la nueva normal $\hat{n}_{nuevo}$ en el nuevo punto medio $M_{nuevo}$, actualizando las coordenadas de datos.

---

## 4. Plantilla para Crear una Nueva Herramienta

1. **Crear Primitivo en `src/core/primitives/navyLib/<MiTool>.js`**:
   - Constructor recibe `(core, data, nw = false)`.
   - Inicializa `this.pins = [ new core.lib.Pin(core, this, 'p1'), ... ]`.
   - Implementa `draw(ctx)`, `collision(x, y)`, `drawText(ctx, text, sett)`.
   - Consulta `this.core.hub?.isDrawingMode()` en `mousedown()` y `mousemove()` antes de permitir hover o arrastre.
2. **Exportar en `src/core/navy/overlayEnv.js`**:
   - Importar `<MiTool>` y agregarlo a `this.lib`.
3. **Crear Overlay en `src/scripts/tools/<MiToolTool>.navy`**:
   - Manejar colección `tools = {}`.
   - Escuchar `$core.uuid + ':tool-<nombre>'`, `$core.uuid + ':update-settings'`, `$core.uuid + ':delete-tool'`.
   - Usar las fórmulas seguras de `t` y `$` (Reglas 2 y 3).
   - Bloquear eventos si `isDrawingMode()` está activo (Regla 9).
4. **Agregar a `DEFAULT_TOOLS` en `src/core/dataHub.js`**:
   - Asegura la auto-inyección en todos los paneles.
5. **Integrar en `DrawingToolbar.svelte` y `FloatingToolbar.svelte`**:
   - Botón en toolbar y componente de estilo en modal.
