<script>
    export let settings = {};
    export let toolType = "fibonacci";
    export let onUpdate = () => {};

    const fiboRetracementLevels = [
        // Columna 1 (12 niveles)
        { value: 0, color: "#787b86", enabled: true },
        { value: 0.236, color: "#f23645", enabled: true },
        { value: 0.382, color: "#ff9800", enabled: true },
        { value: 0.5, color: "#4caf50", enabled: true },
        { value: 0.618, color: "#089981", enabled: true },
        { value: 0.786, color: "#00bcd4", enabled: true },
        { value: 1, color: "#787b86", enabled: true },
        { value: 1.618, color: "#2962ff", enabled: true },
        { value: 2.618, color: "#e91e63", enabled: true },
        { value: 3.618, color: "#2962ff", enabled: false },
        { value: 4.236, color: "#f23645", enabled: false },
        { value: 4.618, color: "#4caf50", enabled: false },

        // Columna 2 (12 niveles)
        { value: 0.88, color: "#2196f3", enabled: false },
        { value: 0.92, color: "#4caf50", enabled: false },
        { value: 1.272, color: "#8bc34a", enabled: false },
        { value: 1.414, color: "#009688", enabled: false },
        { value: 2, color: "#009688", enabled: false },
        { value: 2.272, color: "#8bc34a", enabled: false },
        { value: 2.414, color: "#4caf50", enabled: false },
        { value: 3, color: "#2196f3", enabled: false },
        { value: 3.272, color: "#607d8b", enabled: false },
        { value: 3.414, color: "#3f51b5", enabled: false },
        { value: 4, color: "#b71c1c", enabled: false },
        { value: 4.272, color: "#673ab7", enabled: false }
    ];

    const fiboCircleLevels = [
        { value: 0.236, color: "#f23645", enabled: true },
        { value: 0.382, color: "#ff9800", enabled: true },
        { value: 0.5,   color: "#4caf50", enabled: true },
        { value: 0.618, color: "#089981", enabled: true },
        { value: 0.786, color: "#00bcd4", enabled: true },
        { value: 1.0,   color: "#787b86", enabled: true },
        { value: 1.618, color: "#2962ff", enabled: true },
        { value: 2.618, color: "#e91e63", enabled: true },
        { value: 3.618, color: "#2962ff", enabled: true },
        { value: 4.236, color: "#f23645", enabled: true }
    ];

    const fiboWedgeLevels = [
        { value: 0.236, color: "#f23645", enabled: true },
        { value: 0.382, color: "#ff9800", enabled: true },
        { value: 0.5,   color: "#4caf50", enabled: true },
        { value: 0.618, color: "#089981", enabled: true },
        { value: 0.786, color: "#00bcd4", enabled: true },
        { value: 1,     color: "#787b86", enabled: true },
        { value: 1.618, color: "#2962ff", enabled: false },
        { value: 2.618, color: "#a83850", enabled: false },
        { value: 3.618, color: "#5b479e", enabled: false },
        { value: 4.236, color: "#a12f5a", enabled: false },
        { value: 4.618, color: "#a12f5a", enabled: false }
    ];

    function getToolDefaultLevels(type) {
        if (type === "fibo-wedge") return fiboWedgeLevels;
        if (type === "fibo-circle") return fiboCircleLevels;
        return fiboRetracementLevels;
    }

    $: if (!settings.levels || !settings.levels.length || (toolType === "fibo-wedge" && settings.levels.length === 6)) {
        settings.levels = JSON.parse(JSON.stringify(getToolDefaultLevels(toolType)));
    }

    $: if (!settings.trendLine) {
        settings.trendLine = {
            show: true,
            color: "#787b86",
            width: 1,
            style: "dashed",
        };
    }

    let unifiedColor = "#089981";

    function applyUnifiedColor(color) {
        unifiedColor = color;
        if (settings.levels) {
            settings.levels.forEach((l) => {
                l.color = color;
            });
            onUpdate();
        }
    }

    function update(key, value) {
        settings[key] = value;
        onUpdate();
    }

    function updateTrendLine(key, value) {
        settings.trendLine[key] = value;
        onUpdate();
    }

    function updateLevel(index, key, value) {
        settings.levels[index][key] = value;
        onUpdate();
    }

    $: half = Math.ceil(((settings.levels && settings.levels.length) || getToolDefaultLevels(toolType).length) / 2);
    $: col1Levels = (settings.levels || getToolDefaultLevels(toolType)).slice(0, half);
    $: col2Levels = (settings.levels || getToolDefaultLevels(toolType)).slice(half);
</script>

<div class="tv-fibo-container">
    {#if toolType === "fibo-wedge"}
        <!-- Cuña de Fibonacci (Estilo TradingView directo de captura) -->
        <div class="tv-wedge-levels-list">
            {#each (settings.levels || fiboWedgeLevels) as lvl, idx}
                <div class="tv-wedge-row">
                    <label class="tv-wedge-check">
                        <input
                            type="checkbox"
                            checked={lvl.enabled}
                            on:change={(e) => updateLevel(idx, "enabled", e.target.checked)}
                        />
                    </label>
                    <input
                        type="number"
                        step="any"
                        class="tv-wedge-input"
                        value={lvl.value}
                        on:input={(e) => updateLevel(idx, "value", parseFloat(e.target.value))}
                    />
                    <div class="tv-wedge-color-btn" title="Color de nivel">
                        <input
                            type="color"
                            class="tv-wedge-color-native"
                            value={lvl.color}
                            on:input={(e) => updateLevel(idx, "color", e.target.value)}
                        />
                        <span class="tv-wedge-swatch" style="background-color: {lvl.color};"></span>
                        <span class="tv-wedge-line-sample" style="background-color: {lvl.color};"></span>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Opciones inferiores Cuña -->
        <div class="tv-wedge-bottom">
            <div class="tv-row-space">
                <span class="tv-label">Utilizar un color</span>
                <div class="tv-wedge-color-btn tv-wedge-color-btn-sm" title="Aplicar un solo color a todos los niveles">
                    <input
                        type="color"
                        class="tv-wedge-color-native"
                        value={unifiedColor}
                        on:input={(e) => applyUnifiedColor(e.target.value)}
                    />
                    <span class="tv-wedge-swatch" style="background-color: {unifiedColor};"></span>
                </div>
            </div>

            <div class="tv-row-space">
                <label class="tv-checkbox-inline">
                    <input
                        type="checkbox"
                        checked={settings.showBackground !== false}
                        on:change={(e) => update("showBackground", e.target.checked)}
                    />
                    <span>Fondo</span>
                </label>
                <div class="tv-slider-box-sm">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        class="tv-range tv-range-blue"
                        value={settings.backgroundOpacity != null ? settings.backgroundOpacity : (settings.fillOpacity != null ? settings.fillOpacity : 16)}
                        on:input={(e) => {
                            const val = parseInt(e.target.value);
                            update("backgroundOpacity", val);
                            update("fillOpacity", val);
                        }}
                    />
                </div>
            </div>

            <div class="tv-row-space">
                <label class="tv-checkbox-inline">
                    <input
                        type="checkbox"
                        checked={settings.showLabels !== false}
                        on:change={(e) => update("showLabels", e.target.checked)}
                    />
                    <span>Niveles</span>
                </label>
            </div>
        </div>
    {:else}
        <!-- Retroceso de Fibonacci y Círculo de Fibonacci -->
        <!-- Top options -->
        <div class="tv-row-space">
            <label class="tv-checkbox-inline">
                <input
                    type="checkbox"
                    checked={settings.trendLine?.show !== false}
                    on:change={(e) => updateTrendLine("show", e.target.checked)}
                />
                <span>Línea de tendencia</span>
            </label>
            <div class="tv-style-group">
                <input
                    type="color"
                    class="tv-color-swatch-sm"
                    value={settings.trendLine?.color || "#787b86"}
                    on:input={(e) => updateTrendLine("color", e.target.value)}
                />
                <select
                    class="tv-select-sm"
                    value={settings.trendLine?.style || "dashed"}
                    on:change={(e) => updateTrendLine("style", e.target.value)}
                >
                    <option value="solid">————</option>
                    <option value="dashed">----</option>
                    <option value="dotted">····</option>
                </select>
            </div>
        </div>

        <div class="tv-row-space">
            <span class="tv-label">Línea de niveles</span>
            <div class="tv-style-group">
                <select
                    class="tv-select-sm"
                    value={settings.lineWidth || 1}
                    on:change={(e) => update("lineWidth", parseInt(e.target.value))}
                >
                    <option value="1">1px</option>
                    <option value="2">2px</option>
                    <option value="3">3px</option>
                    <option value="4">4px</option>
                </select>
                <select
                    class="tv-select-sm"
                    value={settings.lineStyle || "solid"}
                    on:change={(e) => update("lineStyle", e.target.value)}
                >
                    <option value="solid">Sólida</option>
                    <option value="dashed">Discontinua</option>
                    <option value="dotted">Puntos</option>
                </select>
            </div>
        </div>

        {#if toolType === "fibonacci" || !toolType}
            <div class="tv-row-space">
                <span class="tv-label">Ampliar</span>
                <select
                    class="tv-select"
                    value={settings.extend || "none"}
                    on:change={(e) => update("extend", e.target.value)}
                >
                    <option value="none">No ampliar</option>
                    <option value="right">Ampliar a la derecha</option>
                    <option value="left">Ampliar a la izquierda</option>
                    <option value="both">Ampliar ambas</option>
                </select>
            </div>
        {/if}

        <div class="tv-row-space">
            <label class="tv-checkbox-inline">
                <input
                    type="checkbox"
                    checked={settings.showLabels !== false}
                    on:change={(e) => update("showLabels", e.target.checked)}
                />
                <span>Etiquetas / Valores</span>
            </label>
        </div>

        <!-- 2 Columns Grid of Levels -->
        <div class="tv-levels-grid">
            <!-- Column 1 -->
            <div class="tv-levels-col">
                {#each col1Levels as lvl, idx}
                    <div class="tv-level-item">
                        <input
                            type="checkbox"
                            checked={lvl.enabled}
                            on:change={(e) => updateLevel(idx, "enabled", e.target.checked)}
                        />
                        <input
                            type="number"
                            step="any"
                            class="tv-level-input"
                            value={lvl.value}
                            on:input={(e) => updateLevel(idx, "value", parseFloat(e.target.value))}
                        />
                        <input
                            type="color"
                            class="tv-color-swatch-sm"
                            value={lvl.color}
                            on:input={(e) => updateLevel(idx, "color", e.target.value)}
                        />
                    </div>
                {/each}
            </div>

            <!-- Column 2 -->
            <div class="tv-levels-col">
                {#each col2Levels as lvl, idx}
                    <div class="tv-level-item">
                        <input
                            type="checkbox"
                            checked={lvl.enabled}
                            on:change={(e) => updateLevel(idx + half, "enabled", e.target.checked)}
                        />
                        <input
                            type="number"
                            step="any"
                            class="tv-level-input"
                            value={lvl.value}
                            on:input={(e) => updateLevel(idx + half, "value", parseFloat(e.target.value))}
                        />
                        <input
                            type="color"
                            class="tv-color-swatch-sm"
                            value={lvl.color}
                            on:input={(e) => updateLevel(idx + half, "color", e.target.value)}
                        />
                    </div>
                {/each}
            </div>
        </div>

        <!-- Background Options -->
        <div class="tv-bottom-options">
            <div class="tv-row-space">
                <label class="tv-checkbox-inline">
                    <input
                        type="checkbox"
                        checked={settings.showBackground !== false}
                        on:change={(e) => update("showBackground", e.target.checked)}
                    />
                    <span>Fondo entre niveles</span>
                </label>
                <div class="tv-slider-box-sm">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        class="tv-range"
                        value={settings.backgroundOpacity != null ? settings.backgroundOpacity : (settings.fillOpacity != null ? settings.fillOpacity : 15)}
                        on:input={(e) => {
                            const val = parseInt(e.target.value);
                            update("backgroundOpacity", val);
                            update("fillOpacity", val);
                        }}
                    />
                    <span class="tv-val-badge">{settings.backgroundOpacity != null ? settings.backgroundOpacity : (settings.fillOpacity != null ? settings.fillOpacity : 15)}%</span>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .tv-fibo-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 420px;
        overflow-y: auto;
        padding-right: 4px;
    }

    .tv-row-space {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-label {
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-checkbox-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: #d1d4dc;
    }

    .tv-checkbox-inline input,
    .tv-level-item input[type="checkbox"] {
        accent-color: #2962ff;
        cursor: pointer;
    }

    .tv-style-group {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .tv-color-swatch-sm {
        width: 24px;
        height: 24px;
        border: 1px solid #363c4e;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        padding: 0;
    }

    .tv-select,
    .tv-select-sm {
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 4px;
        color: #ffffff;
        padding: 4px 8px;
        font-size: 12px;
        outline: none;
        cursor: pointer;
    }

    .tv-select:focus,
    .tv-select-sm:focus {
        border-color: #2962ff;
    }

    .tv-select {
        width: 150px;
    }

    .tv-levels-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 14px;
        margin-top: 6px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid #2a2e39;
        border-radius: 6px;
    }

    .tv-levels-col {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .tv-level-item {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .tv-level-input {
        flex-grow: 1;
        width: 60px;
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 4px;
        color: #ffffff;
        padding: 3px 6px;
        font-size: 12px;
        outline: none;
    }

    .tv-level-input:focus {
        border-color: #2962ff;
    }

    .tv-bottom-options {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid #2a2e39;
    }

    .tv-slider-box-sm {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 140px;
    }

    .tv-range {
        flex-grow: 1;
        accent-color: #2962ff;
        cursor: pointer;
    }

    .tv-val-badge {
        font-size: 12px;
        color: #787b86;
        min-width: 28px;
        text-align: right;
    }

    /* Wedge specific styling - TradingView design */
    .tv-wedge-levels-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 4px 0;
    }

    .tv-wedge-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .tv-wedge-check {
        display: flex;
        align-items: center;
        cursor: pointer;
    }

    .tv-wedge-check input {
        width: 15px;
        height: 15px;
        accent-color: #2962ff;
        cursor: pointer;
        border-radius: 2px;
    }

    .tv-wedge-input {
        width: 80px;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 4px;
        color: #d1d4dc;
        padding: 4px 8px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s;
    }

    .tv-wedge-input:focus {
        border-color: #2962ff;
        color: #ffffff;
    }

    .tv-wedge-color-btn {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 68px;
        height: 28px;
        padding: 0 6px;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 4px;
        cursor: pointer;
        overflow: hidden;
    }

    .tv-wedge-color-btn:hover {
        border-color: #4c525e;
    }

    .tv-wedge-color-btn-sm {
        width: 38px;
        justify-content: center;
        padding: 0;
    }

    .tv-wedge-color-native {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        padding: 0;
        margin: 0;
    }

    .tv-wedge-swatch {
        width: 16px;
        height: 16px;
        border-radius: 2px;
        flex-shrink: 0;
        pointer-events: none;
    }

    .tv-wedge-line-sample {
        flex-grow: 1;
        height: 2px;
        border-radius: 1px;
        pointer-events: none;
    }

    .tv-wedge-bottom {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 10px;
        padding-top: 12px;
        border-top: 1px solid #2a2e39;
    }

    .tv-range-blue {
        accent-color: #2962ff;
    }
</style>
