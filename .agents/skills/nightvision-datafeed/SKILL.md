---
name: nightvision-datafeed
description: Guía completa, arquitectura y especificación para implementar y consumir adaptadores de datos (Datafeeds) en NightVision Charts. Explica el contrato BaseDatafeed, DatafeedManager, streaming en tiempo real de alto rendimiento, paginación histórica infinita y canales avanzados de Order Flow (Footprint y Heatmap de liquidez).
---

# Guía de Integración y Arquitectura del Sistema de Datafeed en NightVision Charts

Esta skill documenta la arquitectura oficial, el contrato de la interfaz y las mejores prácticas para crear adaptadores de datos (**Datafeeds**) en **NightVision Charts**, permitiendo alimentar el gráfico de forma desacoplada, escalable y con soporte para canales tradicionales (OHLCV) y avanzados de Order Flow (**Footprint** y **Heatmap de órdenes**).

---

## 1. Filosofía y Separación de Responsabilidades

```
┌────────────────────────────────────────────────────────┐
│   Backend de Datos (Servidor CCXT / REST / WebSocket)  │
│   - Ingesta de datos del exchange                      │
│   - Agrupación por buckets de precio (Price Bucketing) │
│   - Throttling temporal (ej. 1 snapshot/seg para L2)   │
└───────────────────────────┬────────────────────────────┘
                            │ WebSocket / HTTP
                            ▼
┌────────────────────────────────────────────────────────┐
│     Adaptador Concreto (Fuera de NightVision Core)     │
│          ej: MyServerDatafeed extends BaseDatafeed     │
│   - Traduce los mensajes del backend al contrato NVJS  │
└───────────────────────────┬────────────────────────────┘
                            │ API Contract
                            ▼
┌────────────────────────────────────────────────────────┐
│               DatafeedManager (Core NVJS)              │
│   - Ingesta optimizada de ticks (requestAnimationFrame)│
│   - Paginación histórica infinita (scroll al pasado)   │
│   - Sincronización con Web Worker (chart.se)           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  NightVision Canvas                    │
│   - Renderizado fluido a 60 FPS                        │
└────────────────────────────────────────────────────────┘
```

* **NightVision Core**: Se mantiene agnóstico y ligero. Solo provee el contrato base (`BaseDatafeed`) y el orquestador (`DatafeedManager`).
* **Conectores y Adaptadores**: Viven fuera del Core (en la aplicación cliente o paquetes satélite). Esto evita atar el motor gráfico a exchanges específicos (Binance, Bybit, etc.) y evita problemas de CORS o mantenimiento de APIs externas.

---

## 2. Contrato de la Interfaz (`BaseDatafeed`)

Cualquier adaptador de datos debe extender de `BaseDatafeed` e implementar sus métodos clave:

```javascript
import { BaseDatafeed } from 'night-vision';

export class CustomDatafeed extends BaseDatafeed {
    constructor(options = {}) {
        super(options);
    }

    // 1. Configuración de resoluciones soportadas
    onReady(callback) {
        callback({
            supported_resolutions: ['1', '5', '15', '60', '240', '1D'],
            supports_marks: false,
            supports_time: true
        });
    }

    // 2. Metadatos del símbolo (decimales, tick size, etc.)
    resolveSymbol(symbolName, onResolve, onError) {
        onResolve({
            name: symbolName,
            ticker: symbolName,
            pricescale: 100, // 2 decimales (ej. 0.01)
            minmov: 1,
            timezone: 'Etc/UTC',
            has_intraday: true,
            supported_resolutions: ['1', '5', '15', '60', '240', '1D']
        });
    }

    // 3. Obtención de velas históricas (carga inicial y scroll al pasado)
    async getBars(symbolInfo, resolution, periodParams, onHistory, onError) {
        const { from, to, countBack, firstDataRequest } = periodParams;
        try {
            // Petición a tu API REST o caché
            const bars = await fetchHistory(symbolInfo.name, resolution, from, to, countBack);
            // Formato de cada vela: [timestamp, open, high, low, close, volume]
            onHistory(bars, { noData: bars.length === 0 });
        } catch (err) {
            onError(err.message);
        }
    }

    // 4. Suscripción a velas en tiempo real (WebSocket)
    subscribeBars(symbolInfo, resolution, onRealtimeBar, subscriberUID) {
        super.subscribeBars(symbolInfo, resolution, onRealtimeBar, subscriberUID);

        // Conectar al WebSocket y llamar onRealtimeBar(candle)
        this.ws.on('candle', (candle) => {
            // candle puede ser array [t, o, h, l, c, v] u objeto { time, open, high, low, close, volume }
            onRealtimeBar(candle);
        });
    }

    // 5. Desuscripción de tiempo real
    unsubscribeBars(subscriberUID) {
        super.unsubscribeBars(subscriberUID);
        // Desconectar o pausar canal de WebSocket
    }
}
```

---

## 3. Canales Avanzados para Order Flow (Footprint y Heatmap)

A diferencia de la API estándar de TradingView que solo maneja velas, `BaseDatafeed` incluye ganchos opcionales para canales de subasta profunda:

### A. Canal de Trades (`subscribeTrades`) — Para Footprint y Delta
Utilizado para calcular los deltas de volumen por nivel de precio dentro de la vela:

```javascript
subscribeTrades(symbolInfo, onTrade, subscriberUID) {
    super.subscribeTrades(symbolInfo, onTrade, subscriberUID);

    this.ws.on('trade', (trade) => {
        onTrade({
            price: Number(trade.p),
            qty: Number(trade.q),
            isBuyerMaker: Boolean(trade.m), // true = venta agresiva al Bid; false = compra agresiva al Ask
            time: Number(trade.t)
        });
    });
}

unsubscribeTrades(subscriberUID) {
    super.unsubscribeTrades(subscriberUID);
}
```

### B. Canal de Profundidad (`subscribeDepth`) — Para Heatmap de Liquidez
Utilizado para alimentar el mapa de calor térmico con los muros de órdenes límite:

```javascript
subscribeDepth(symbolInfo, onDepthSnapshot, onDepthUpdate, subscriberUID) {
    super.subscribeDepth(symbolInfo, onDepthSnapshot, onDepthUpdate, subscriberUID);

    this.ws.on('depthSnapshot', (snapshot) => {
        onDepthSnapshot(snapshot);
    });

    this.ws.on('depthUpdate', (slice) => {
        onDepthUpdate(slice);
    });
}

unsubscribeDepth(subscriberUID) {
    super.unsubscribeDepth(subscriberUID);
}
```

---

## 4. Uso del Datafeed en NightVision

### Inicialización en la aplicación cliente:
```javascript
import { NightVision } from 'night-vision';
import { CustomDatafeed } from './customDatafeed.js';

const datafeed = new CustomDatafeed({ url: 'wss://mi-servidor.com/ws' });

const chart = new NightVision('chart-container', {
    datafeed: datafeed,
    symbol: 'BTC/USDT',
    timeframe: '1m',
    theme: 'dark',
    autoResize: true
});
```

### Métodos de control dinámico:
```javascript
// Cambiar de activo
chart.setSymbol('ETH/USDT', '5m');

// Cambiar de temporalidad
chart.setTimeframe('15m');

// Destruir y liberar recursos (WebSockets, AnimationFrames, Web Workers)
chart.destroy();
```

---

## 5. Reglas Críticas de Rendimiento en `DatafeedManager`

El orquestador interno `DatafeedManager` aplica automáticamente las siguientes reglas para garantizar **60 FPS** sin degradación de rendimiento:

1. **Bifurcación Estricta de Ticks (Intra-candle vs Nueva Vela)**:
   * **Intra-candle tick** (`ts === lastCandle[0]`): Muta el último elemento del array `mainOv.data[last]` *in-place*. **NO** llama a `calcOhlcMap()` ($O(N)$). Solo programa un repintado ligero `chart.update('layout')`.
   * **Nueva vela** (`ts > lastCandle[0]`): Hace `ohlc.push(newCandle)`, llama a `chart.update('data')`, `chart.scroll()` y envía la vela al Web Worker con `chart.se.updateData()`.

2. **Batching con `requestAnimationFrame`**:
   * Los ticks que llegan en ráfagas rápidas de WebSocket se agrupan dentro del ciclo de renderizado nativo del navegador, eliminando repintados redundantes.

3. **Sincronización con el Script Engine de Indicadores**:
   * Al cargar el histórico inicial o al cambiar de temporalidad/símbolo, `DatafeedManager` llama a `chart.se.uploadAndExec()`. Esto garantiza que los indicadores calculados en Web Worker (SMA, RSI, MACD, etc.) se recalculen inmediatamente sobre el nuevo dataset sin quedar desfasados.

4. **Paginación Infinita Silenciosa**:
   * Escucha `app:$range-update`. Cuando el usuario hace scroll hacia la izquierda y se aproxima a la vela más antigua, solicita el bloque anterior a `getBars()`, antepone las velas con `unshift` y actualiza la escala sin saltos visuales.

---

## 6. Arquitectura Recomendada para el Servidor de Datos (CCXT + WebSocket)

Para alimentar el Datafeed (especialmente el futuro Heatmap de liquidez):
1. **Servidor Intermedio (Node/Python con CCXT)**:
   * Mantiene una única conexión WebSocket con el exchange (evitando bloqueos por IP).
   * **Price Bucketing**: Agrupa los precios por pasos fijos (`tickSize` de $5 o $10) en lugar de enviar centavos.
   * **Window Depth**: Filtra solo órdenes dentro de $\pm 5\%$ o $\pm 10\%$ del precio actual.
   * **Time Slicing**: Emite snapshots del libro a una frecuencia controlada (ej. 1 slice por segundo).
   * **Array Plano**: Envía arrays numéricos planos en lugar de JSON verboso para minimizar ancho de banda.
