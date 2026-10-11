---
name: nightvision-layout-persistence
description: Guía de arquitectura, especificación de persistencia y adaptadores de almacenamiento (Save/Load Layout) en NightVision Charts. Explica cómo serializar y restaurar dibujos, indicadores y configuración de paneles, eventos de auto-guardado reactivo y el patrón StorageAdapter.
---

# Guía de Persistencia y Storage Adapter en NightVision Charts

Esta skill documenta la arquitectura oficial, los métodos de API y las mejores prácticas para guardar y restaurar el **estado de usuario** (dibujos, indicadores, personalizaciones y estructura de paneles) en **NightVision Charts** de forma desacoplada y eficiente (patrón similar a TradingView Charting Library).

---

## 1. Filosofía: Separación entre Mercado y Estado de Usuario

Un error común es intentar guardar todo el objeto `chart.data` (incluyendo miles de velas históricas OHLCV). En una arquitectura profesional:

```
┌────────────────────────────────────────────────────────┐
│             Datos de Mercado (Time-Series)             │
│   - Velas OHLCV, ticks, order flow                     │
│   - Se obtienen dinámicamente del Datafeed / Exchange   │
│   - NO se guardan en el layout del usuario             │
└────────────────────────────────────────────────────────┘
                           vs
┌────────────────────────────────────────────────────────┐
│            Estado del Usuario (LayoutState)            │
│   - Dibujos (Líneas, Fibonaccis, Rectángulos)          │
│   - Indicadores agregados (SMA, RSI, SuperBands)       │
│   - Parámetros personalizados (length, colores, estilos│
│   - Disposición de paneles (alturas, orden, estados)   │
│   - Peso ligero: 2 KB a 15 KB (fácil de almacenar)     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Estructura del Esquema `LayoutState`

El método `chart.saveLayout()` produce un objeto JavaScript plano completamente serializable a JSON:

```json
{
  "version": 1,
  "timestamp": 1740000000000,
  "chart": {
    "timezone": -3,
    "colors": {
      "back": "#121417",
      "grid": "#2e3238"
    },
    "mainOverlay": {
      "type": "Candles",
      "props": { "colorBodyUp": "#26a69a", "colorBodyDw": "#ef5350" },
      "settings": {}
    }
  },
  "panes": [
    {
      "id": 0,
      "isMain": true,
      "settings": {},
      "tools": [
        {
          "name": "LineTool",
          "type": "LineTool",
          "uuid": "tool-uuid-1",
          "dataExt": {
            "lines": [
              {
                "type": "segment",
                "p1": [1710000000000, 65000],
                "p2": [1710050000000, 68000],
                "settings": { "color": "#ffeb3b", "width": 2 }
              }
            ]
          },
          "props": {},
          "settings": { "zIndex": 1 }
        }
      ],
      "scripts": [
        {
          "name": "SMA",
          "type": "SMA",
          "uuid": "script-uuid-1",
          "props": { "length": 50, "color": "#2962ff" },
          "settings": { "zIndex": 0 }
        }
      ],
      "extraOverlays": []
    },
    {
      "id": 1,
      "isMain": false,
      "settings": { "height": 0.25 },
      "tools": [],
      "scripts": [
        {
          "name": "RSI",
          "type": "RSI",
          "uuid": "script-uuid-2",
          "props": { "length": 14, "color": "#e91e63" },
          "settings": {}
        }
      ],
      "extraOverlays": []
    }
  ]
}
```

---

## 3. Métodos del Core de NightVision

### `chart.saveLayout(options?)`
Exporta el estado limpio del usuario sin los datos masivos de velas.

* **Parámetros**:
  * `options.includeRange` *(boolean)*: Si es `true`, incluye `[t1, t2]` del rango visible actual. (Por defecto `false`).
* **Retorno**: `LayoutState` (objeto serializable con `JSON.stringify`).

```javascript
const layout = chart.saveLayout();
```

---

### `chart.loadLayout(layoutData)`
Restaura paneles, indicadores y herramientas de dibujo preservando los datos de velas cargados en el gráfico.

* **Parámetros**:
  * `layoutData` *(Object | string)*: El objeto previamente exportado o un string JSON.
* **Retorno**: `Promise<boolean>` (`true` si se aplicó con éxito).

```javascript
await chart.loadLayout(savedLayout);
```

---

### `chart.on(event, handler)` / `chart.off(event, handler)`
Manejo directo de eventos del gráfico desde la instancia `NightVision`.

* **Eventos clave**:
  * `'chart:layout-changed'`: Se dispara automáticamente cuando el usuario:
    * Agrega, edita o elimina una herramienta de dibujo (`LineTool`, `RectTool`, etc.).
    * Agrega, edita o elimina un indicador desde la leyenda o el catálogo modal.
    * Mueve, reordena, maximiza, colapsa o redimensiona paneles.
  * `'layout-loaded'`: Se emite cuando finaliza la restauración de un layout.

```javascript
chart.on('chart:layout-changed', () => {
    console.log('El usuario modificó el gráfico');
});
```

---

## 4. Patrones de Integración

### Patrón 1: Backend REST / API Propia (Recomendado)
Guardado explícito o mediante botón "Guardar Plantilla":

```javascript
import { NightVision } from 'night-vision';

const chart = new NightVision('chart-container', {
    data: initialData
});

// Guardar
async function saveUserTemplate(templateName) {
    const layout = chart.saveLayout();
    
    await fetch('/api/charts/layouts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
            name: templateName,
            symbol: 'BTC/USDT',
            layout: layout
        })
    });
}

// Cargar
async function loadUserTemplate(layoutId) {
    const res = await fetch(`/api/charts/layouts/${layoutId}`);
    const { layout } = await res.json();
    if (layout) {
        await chart.loadLayout(layout);
    }
}
```

---

### Patrón 2: Auto-Guardado Reactivo con Debounce
Guarda silenciosamente en segundo plano unos segundos después de que el usuario termina de realizar una acción:

```javascript
function debounce(fn, delay = 2000) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

chart.on('chart:layout-changed', debounce(async () => {
    const layout = chart.saveLayout();
    
    try {
        await fetch('/api/user/active-layout', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ layout })
        });
        console.log('Layout sincronizado en la nube');
    } catch (err) {
        console.warn('Error sincronizando layout:', err);
    }
}, 2000));
```

---

### Patrón 3: StorageAdapter Integrado en el Constructor
Inyección de adaptador desacoplado directamente al inicializar el gráfico:

```javascript
const chart = new NightVision('chart-container', {
    datafeed: myDatafeed,
    autoSave: true,          // Habilita auto-guardado en background
    autoSaveDelay: 1500,     // Debounce de 1.5s
    storageAdapter: {
        saveLayout: async (layout) => {
            localStorage.setItem('nv_layout_active', JSON.stringify(layout));
        },
        loadLayout: async () => {
            const raw = localStorage.getItem('nv_layout_active');
            return raw ? JSON.parse(raw) : null;
        }
    }
});

// Carga inicial
const saved = await chart.storageAdapter.loadLayout();
if (saved) {
    await chart.loadLayout(saved);
}
```

---

## 5. Mejores Prácticas y Gotchas

1. **Mantener `uuid` estables**: NightVision genera identificadores UUID para cada indicador y dibujo. Al serializar y restaurar, mantener los `uuid` evita que la interfaz parpadee o pierda el foco en ventanas de configuración.
2. **Carga en cascada con Datafeed**: Al arrancar la aplicación, inicializa el gráfico con las velas del datafeed primero y luego ejecuta `await chart.loadLayout(savedLayout)`.
3. **Múltiples Símbolos / Temporalidades**: Si deseas que los dibujos pertenezcan al par actual (ej. `BTC/USDT`), indexa tus guardados por símbolo:
   ```javascript
   const key = `layout_${symbol}`;
   ```
4. **Debounce obligatorio**: Nunca guardes inmediatamente en cada pixel de arrastre de una herramienta; espera a que el evento termine (gestionado automáticamente con el debounce de `chart:layout-changed`).
