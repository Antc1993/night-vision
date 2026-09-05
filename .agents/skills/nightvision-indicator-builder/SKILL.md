---
name: nightvision-indicator-builder
description: >-
  Comprehensive guide and reference for creating custom indicators and overlays for NightVision charts.
  Use when creating, modifying, or porting indicators (including Pine Script ports) using NavyJS (.navy),
  NightVision Script Engine (SE), built-in overlays, and built-in indicators.
---

# NightVision Indicator & Overlay Builder Skill

This skill provides complete instructions, API specifications, cheat sheets, and porting patterns to build custom technical indicators and visual overlays for **NightVision Charts** and **NavyJS**.

---

## 1. Architecture Overview

NightVision organizes chart rendering into modular layers:

```
NightVision Instance
└── Data / Panes
    ├── Pane 0 (Main: Price, Candlesticks, Overlays)
    │   ├── Overlay: Candles (scale: 'A')
    │   ├── Overlay: Custom Overlays (e.g., MSB, OrderBlocks, Bands)
    │   └── Scripts: Built-in Indicators (e.g., SMA, EMA)
    └── Pane 1 (Secondary: RSI, MACD, Volume Delta)
        └── Overlay / Scripts (scale: 'A' or 'B')
```

### Key Components:
- **NavyJS (`.navy`)**: The Canvas 2D / WebGL rendering layer defining *how* data is visually drawn.
- **Script Engine (`[INDICATOR]`)**: Built-in math engine that computes indicators step-by-step from OHLCV data using standard TA functions.
- **Data Array**: Time-series arrays passed to overlays (e.g. `[timestamp, val1, val2, ...]`).

---

## 2. Built-in Overlays Catalog

NightVision comes with ready-to-use overlay renderers. When using these, your data array must match the specified structure:

| Overlay Name | Data Format | Description |
| :--- | :--- | :--- |
| `Candles` | `[t, O, H, L, C, V]` | Main candlestick layer with volume wicks. |
| `CandlesPlus` | `[t, O, H, L, C, V, color]` | Custom-colored candlestick bars. |
| `Spline` | `[t, value]` | Single smooth continuous line (MA, oscillator). |
| `Splines` | `[t, val1, val2, val3, ...]` | Multiple colored lines (e.g. EMA ribbons, RSI with bands). |
| `Band` | `[t, upper, middle, lower]` | Volatility channel (Bollinger Bands, Keltner Channel). |
| `SuperBands`| `[t, u2, u1, mid, l1, l2]` | Multi-level confidence bands. |
| `Cloud` | `[t, upper, lower]` | Semi-transparent filled area between two bounds (Ichimoku). |
| `Histogram` | `[t, value]` | Vertical histogram bars centered at zero (MACD histogram, Delta). |
| `Range` | `[t, value]` | Oscillator line with predefined upper & lower guide bands (RSI 70/30). |
| `Area` / `AppleArea` | `[t, value]` | Gradient-filled area chart underneath a price spline. |
| `Trades` | `[t, price, size, dir]` | Trade execution circles/bubbles (dir: 1 = Buy, -1 = Sell). |
| `ArrowTrades` | `[t, [dir, label, flag]]` | Stacked buy/sell signal arrows above/below candles. |
| `PriceLabels` | `[t, price, text]` | Dynamic floating price badges attached to candle highs/lows. |
| `Sparse` | `[t, value]` | Isolated points/dots rendered across specific bars. |
| `HeatMap` | `[t, y1, y2, y3, y4, count, color]` | Liquidity/order book depth density heatmap bands. |
| `VolumeDelta` | `[t, buyVol, sellVol, totalVol, delta]` | Color-coded order flow delta bars. |

---

## 3. Built-in Indicators Catalog (Script Engine)

NightVision includes 27+ built-in indicators with pre-compiled math in its standard library (`se-std-lib`):

| Indicator | Code / Standard Call | Parameters (Default) |
| :--- | :--- | :--- |
| **SMA** | `sma(source, length)` | `close, 14` |
| **EMA** | `ema(source, length)` | `close, 14` |
| **HMA** | `hma(source, length)` | `close, 14` |
| **ALMA** | `alma(source, length, offset, sigma)` | `close, 9, 0.85, 6` |
| **SWMA** | `swma(source)` | Symmetrical weighted MA over 4 bars |
| **VWMA** | `vwma(source, length)` | `close, 14` |
| **RSI** | `rsi(source, length)` | `close, 14` |
| **MACD** | `macd(source, fast, slow, signal)` | `close, 12, 26, 9` |
| **BB** | `bb(source, length, stdDev)` | `close, 20, 2` |
| **BBW** | `bbw(source, length, stdDev)` | Bollinger Bands Width |
| **ATR** | `atr(length)` | `14` |
| **ATRp** | `atrp(length)` | ATR as percentage of price |
| **CCI** | `cci(source, length)` | `close, 20` |
| **CMO** | `cmo(source, length)` | Chande Momentum Oscillator |
| **COG** | `cog(source, length)` | Center of Gravity |
| **DMI** | `dmi(diLength, adxLength)` | Directional Movement Index |
| **Ichimoku**| `ichimoku(tenkan, kijun, senkouB)` | `9, 26, 52` |
| **KC** | `kc(source, length, mult)` | Keltner Channel |
| **KCW** | `kcw(source, length, mult)` | Keltner Channel Width |
| **MFI** | `mfi(length)` | Money Flow Index |
| **MOM** | `mom(source, length)` | Momentum |
| **ROC** | `roc(source, length)` | Rate of Change |
| **SAR** | `sar(start, inc, max)` | `0.02, 0.02, 0.2` |
| **Stoch** | `stoch(length, smoothK, smoothD)` | `14, 1, 3` |
| **TSI** | `tsi(source, short, long)` | True Strength Index |
| **WilliamsR**| `williamsr(length)` | `14` |

---

## 4. Creating a Custom NavyJS Script (`.navy`)

A `.navy` file defines customizable properties and a high-performance Canvas 2D render loop.

### Complete Template:
```navy
// Navy ~ 0.2-lite
[OVERLAY name=MyIndicator, ctx=Canvas, author=Antigravity, version=1.0.0]

// 1. Define Customizable Properties
prop('lineColor', { type: 'color', def: '#6366f1' })
prop('lineWidth', { type: 'number', def: 2 })
prop('showFill', { type: 'boolean', def: true })
prop('fillColor', { type: 'color', def: 'rgba(99, 102, 241, 0.15)' })

// 2. Main Drawing Loop
draw(ctx) {
    const layout = $core.layout;  // Coordinate transformation API
    const data = $core.data;      // Full data array passed to this overlay
    const view = $core.view;      // Visible candle index window: view.i1 to view.i2

    if (!data || data.length === 0) return;

    ctx.save();
    ctx.lineWidth = $props.lineWidth;
    ctx.strokeStyle = $props.lineColor;
    ctx.beginPath();

    // Iterate through only the visible range for maximum FPS
    for (let i = view.i1; i <= view.i2; i++) {
        const point = data[i];
        if (!point) continue;

        const x = layout.ti2x(point[0], i); // Map timestamp + index to Screen X
        const y = layout.value2y(point[1]); // Map price value to Screen Y

        if (i === view.i1) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    ctx.restore();
}

// 3. Optional: Y-Range Bounds Calculation
yRange(hi, lo) => [hi, lo]

// 4. Optional: Value Legend Display
legend(x) => [[x[1], $props.lineColor]]
```

### 4.1 Reglas Críticas al Escribir Scripts NavyJS (`.navy`)
1. **Prohibido redeclarar variables con `const` o `let`**:
   - Todo el código de funciones de un `.navy` es envuelto por el parser en una única función JavaScript mediante `new Function('env', ...)`.
   - Si declaras dos veces `const layout = $core.layout` o cualquier variable con el mismo nombre dentro del mismo bloque o función, el motor lanzará `SyntaxError: Identifier '...' has already been declared`.
   - Ese fallo impide que el overlay se registre en `this.prefabs` del gráfico.
2. **Coordenadas de tiempo y cursor seguras**:
   - Al interactuar con `$core.cursor`, no uses solamente `cursor.time !== undefined`, pues `cursor.time` puede ser explícitamente `null`.
   - Usa siempre: `let t = (cursor.time != null && !isNaN(cursor.time)) ? cursor.time : cursor.ti; if ((t == null || isNaN(t)) && layout.x2t) t = layout.x2t(cursor.x)`.
   - Guardar `null` proyecta los puntos al año 1970 fuera del canvas visible al cambiar de timeframe.
3. **Coordenada Y segura**:
   - `cursor.y` puede ser `undefined` en eventos inmediatos. Usa siempre fallback: `const cy = cursor.y !== undefined ? cursor.y : ($core.mouse ? $core.mouse.y : 0)`.

### Essential `$core` APIs inside `draw(ctx)`:
- `layout.ti2x(timestamp, index)`: Converts timestamp + bar index to pixel X coordinate.
- `layout.value2y(price)`: Converts price value to pixel Y coordinate.
- `layout.width`, `layout.height`: Current canvas width and height in pixels.
- `view.i1`, `view.i2`: Index of the first and last visible candle on the screen.
- `$core.colors`: System theme colors (`$core.colors.back`, `$core.colors.grid`, `$core.colors.text`).

---

## 5. Porting Guide: Pine Script to NightVision

To convert any TradingView Pine Script to NightVision:

### Step 1: Map Pine Script Types to Data Structure
- **Líneas (`plot`)**: Map to `[timestamp, value1, value2, ...]`.
- **Nubes (`fill`)**: Map to `[timestamp, upperValue, lowerValue]`.
- **Señales / Flechas (`plotshape`)**: Map to `[timestamp, [direction, 'BUY'/'SELL']]`.
- **Cajas / Zonas (`box.new`)**: Map to an object payload `{ x1, x2, top, bottom, color, tag }`.

### Step 2: Write the Math Calculator (JavaScript/TypeScript)
Create a function `calculateIndicator(candles, params)`:
```javascript
export function calculateMyIndicator(candles, period = 14) {
    if (!candles || candles.length === 0) return [];
    
    return candles.map((c, i, arr) => {
        const timestamp = c[0];
        const close = c[4];
        
        // Math calculation (e.g. SMA/EMA)
        const slice = arr.slice(Math.max(0, i - period + 1), i + 1);
        const sma = slice.reduce((sum, bar) => sum + bar[4], 0) / slice.length;
        
        return [timestamp, sma];
    });
}
```

### Step 3: Real-Time Live Tick Synchronization
For live WebSocket streams (Binance/Redis), update overlays reactively:
```javascript
function updateOverlaysDataLive(isNewCandle) {
    const candles = chart.data.panes[0].overlays[0]?.data || [];
    overlayScripts.forEach((item) => {
        if (item.active) {
            const ov = chart.data.panes[0].overlays.find(o => o.type === item.id);
            if (ov) {
                const allData = generateOverlayData(item.id, candles);
                // For whole-state indicators (MSB, Boxes, Heatmap): replace data directly
                if (allData.length <= 1) {
                    ov.data = allData;
                } else if (isNewCandle) {
                    ov.data.push(allData[allData.length - 1]);
                } else {
                    ov.data[ov.data.length - 1] = allData[allData.length - 1];
                }
            }
        }
    });
}
```

---

## 6. Multi-Scale Isolation (Scale Template)

When adding an indicator with a different value range (e.g. Volume, RSI, Oscillators 0-100) to the main pane:
1. Assign it `scale: 'B'` in `overlay.settings.scale`.
2. Configure `pane.settings.scaleTemplate = [['A'], ['B']]` (or `[[], ['A', 'B']]`).
3. Always update `settings.scaleSideIdxs = ['A', 'B']` and call `chart.update('full')` when toggling template sides to avoid sidebar rendering mismatch.
