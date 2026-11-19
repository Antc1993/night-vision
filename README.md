# 🌙 NightVision Charts (Community Vibe-Coded Edition)

> **Notice:** This project is a community-driven fork of the original [NightVision Charts](https://github.com/project-nv/night-vision) created by [ChartMaster](https://github.com/project-nv).  
> It has been enhanced and modernized using **vibe-coding with AI**, adding complete TradingView-like parity to interactive tools, layout persistence, real-time datafeed adapters, an indicator catalog modal with 30+ technical indicators, and critical performance & rendering bug fixes.

---

## ✨ What's New in this Edition

- 🛠️ **TradingView-Grade Interactive Tools**:
  - **Fibonacci Suite**: Retracements, Elliptical Fibonacci Circles (true price/time scale aspect ratio), and Fibonacci Wedge.
  - **Measurement Tool**: Candle count, exact duration, price range, percentage return, and volume sum calculations.
  - **Shapes & Overlays**: Trend Lines, Rays, Horizontal/Vertical Lines, Rectangles, Circles, Ellipses, 3-point Arcs, Triangles, Paths, Text annotations, and Position (Long/Short) tools.
  - **Floating Toolbar**: Contextual quick styling toolbar on drawing selection with double-click modal settings dialog.
- 📊 **Built-in Indicator Catalog Modal**:
  - Modal with 30+ pre-built technical indicators (Trend, Oscillators, Volatility, Volume, Custom NavyJS scripts).
  - Open with a single call (`chart.openIndicatorsModal()`).
- 📈 **Multiple Chart Types Support**:
  - Easily switch between Candlesticks (`Candles`), `Bars`, `HeikinAshi`, `HollowCandles`, `Area`, `Baseline`, and `Spline`.
- 💾 **Full Layout Persistence**:
  - Save and restore entire workspaces (`saveLayout()` / `loadLayout()`) including indicators, drawing annotations, scales, and pane configs.
- ⚡ **Datafeed Adapter & Real-Time Engine**:
  - High-performance real-time streaming, historical pagination, and symbol/timeframe switching.

---

## 🚀 Installation

### Option 1: Direct from GitHub
```bash
npm install github:<your-username>/night-vision
```

### Option 2: Clone & Local Build
```bash
git clone https://github.com/<your-username>/night-vision.git
cd night-vision
npm install
npm run build
```

---

## 📖 Quick Tutorial / Guía de Uso

### 1. Inicialización Básica

```html
<div id="chart-container" style="width: 100%; height: 600px;"></div>

<script type="module">
import { NightVision } from 'night-vision'

// Datos OHLCV: [timestamp, open, high, low, close, volume]
const ohlcv = [
    [1672531199000, 16500, 16600, 16450, 16580, 120.5],
    [1672531259000, 16580, 16700, 16550, 16680, 145.2],
    // ...
]

const chart = new NightVision('chart-container', {
    data: {
        panes: [{
            overlays: [{
                name: 'BTC/USDT',
                type: 'Candles',
                main: true,
                data: ohlcv
            }]
        }]
    },
    autoResize: true,
    toolbar: true // Habilita la barra de herramientas de dibujo
})
</script>
```

---

### 2. Cómo Abrir la Ventana de Indicadores

Puedes abrir el catálogo interactivo de indicadores directamente desde código (por ejemplo, desde un botón en tu UI o barra de navegación):

```javascript
// Llamada directa desde la instancia del gráfico:
chart.openIndicatorsModal()

// O disparando el evento interno:
chart.events.emit('open-indicators-modal')
```

También puedes agregar indicadores programáticamente sin abrir la ventana:
```javascript
// Agregar un indicador a un nuevo sub-panel inferior (ej. RSI, MACD):
chart.addIndicator('RSI')

// Agregar una media móvil al gráfico principal con parámetros:
chart.addIndicator('EMA', { length: 20 })
chart.addIndicator('SMA', { length: 200 })
chart.addIndicator('SuperBands')
```

---

### 3. Cómo Cambiar el Tipo de Gráfico

Tienes dos formas de cambiar el tipo de visualización principal:

#### A) En tiempo de ejecución (en caliente):
```javascript
// Tipos soportados: 'Candles', 'Bars', 'HeikinAshi', 'HollowCandles', 'Area', 'Baseline', 'Spline'
function setChartType(type) {
    if (chart.hub && chart.hub.mainOv) {
        chart.hub.mainOv.type = type
        chart.update('full')
    }
}

// Ejemplos:
setChartType('HeikinAshi') // Velas Heikin Ashi
setChartType('Bars')       // Barras OHLC
setChartType('Area')       // Gráfico de Área
setChartType('Candles')    // Velas tradicionales
```

#### B) Al definir el dataset inicial:
```javascript
chart.data = {
    panes: [{
        overlays: [{
            name: 'BTC/USDT',
            type: 'HeikinAshi', // <-- Aquí defines el tipo
            main: true,
            data: ohlcv
        }]
    }]
}
```

---

### 4. Guardar y Restaurar Dibujos y Layouts

Guarda todos los dibujos del usuario, indicadores y configuraciones de paneles para persistirlos en `localStorage` o en tu base de datos:

```javascript
// Guardar el layout completo
const savedLayout = chart.saveLayout()
localStorage.setItem('my_chart_layout', JSON.stringify(savedLayout))

// Restaurar el layout en cualquier momento
const layoutData = JSON.parse(localStorage.getItem('my_chart_layout'))
if (layoutData) {
    chart.loadLayout(layoutData)
}
```

---

### 5. Adaptador de Datos en Tiempo Real (Datafeed)

Puedes conectar un adaptador WebSocket o REST para streaming barra a barra sin recargar todo el dataset:

```javascript
import { BaseDatafeed } from 'night-vision'

class MyCryptoDatafeed extends BaseDatafeed {
    async fetchHistoricalBars(symbol, timeframe, from, to) {
        const response = await fetch(`/api/klines?symbol=${symbol}&tf=${timeframe}&from=${from}&to=${to}`)
        return await response.json() // [[t, o, h, l, c, v], ...]
    }

    subscribeRealtime(symbol, timeframe, onBarUpdate) {
        const ws = new WebSocket(`wss://stream.myexchange.com/ws/${symbol}@kline_${timeframe}`)
        ws.onmessage = (event) => {
            const bar = JSON.parse(event.data)
            onBarUpdate([bar.t, bar.o, bar.h, bar.l, bar.c, bar.v])
        }
        return () => ws.close() // Función de limpieza
    }
}

// Conectar al gráfico:
const datafeed = new MyCryptoDatafeed()
chart.setDatafeed(datafeed, 'BTC/USDT', '1h')
```

---

## 🛠️ Scripts & Desarrollo

```bash
# Servidor de desarrollo con recarga rápida
npm run dev

# Compilar para producción (genera bundle ES & UMD en /dist)
npm run build

# Previsualizar build local
npm run preview
```

---

## 📜 Licencia & Reconocimientos

- **Base Original**: Desarrollado por [ChartMaster](https://github.com/project-nv) bajo licencia ISC/MIT.
- **Mejoras & Vibe Coding**: Desarrollado con asistencia de IA para trading profesional y herramientas estilo TradingView.
