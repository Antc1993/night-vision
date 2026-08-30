<script>
    export let settings = {};
    export let onUpdate = () => {};

    const defaultLevels = [
        // Columna 1 (12 niveles)
        { value: 0, color: "#787b86", enabled: false },
        { value: 0.92, color: "#4caf50", enabled: false },
        { value: 0.618, color: "#ffff00", enabled: true },
        { value: 1, color: "#787b86", enabled: true },
        { value: 0.382, color: "#f23645", enabled: true },
        { value: 4.236, color: "#9c27b0", enabled: false },
        { value: 1.618, color: "#f23645", enabled: true },
        { value: 2.414, color: "#4caf50", enabled: false },
        { value: 3, color: "#2196f3", enabled: false },
        { value: 3.414, color: "#3f51b5", enabled: false },
        { value: 4.272, color: "#673ab7", enabled: false },
        { value: 4.618, color: "#4caf50", enabled: false },

        // Columna 2 (12 niveles)
        { value: 0.236, color: "#f23645", enabled: true },
        { value: 0.5, color: "#4caf50", enabled: true },
        { value: 0.786, color: "#ffff00", enabled: true },
        { value: 0.88, color: "#2196f3", enabled: true },
        { value: 3.618, color: "#9c27b0", enabled: false },
        { value: 1.272, color: "#8bc34a", enabled: true },
        { value: 2.272, color: "#8bc34a", enabled: true },
        { value: 2, color: "#009688", enabled: false },
        { value: 3.272, color: "#607d8b", enabled: false },
        { value: 4, color: "#b71c1c", enabled: false },
        { value: 4.414, color: "#ad1457", enabled: false },
        { value: 4.764, color: "#00897b", enabled: false },
    ];

    $: if (!settings.levels || !settings.levels.length) {
        settings.levels = JSON.parse(JSON.stringify(defaultLevels));
    }

    $: if (!settings.trendLine) {
        settings.trendLine = {
            show: true,
            color: "#787b86",
            width: 1,
            style: "dashed",
        };
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

    $: col1Levels = (settings.levels || defaultLevels).slice(0, 12);
    $: col2Levels = (settings.levels || defaultLevels).slice(12, 24);
</script>

<div class="tv-fibo-container">
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

    <!-- 2 Columns Grid of 24 Levels -->
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
                        on:change={(e) => updateLevel(idx + 12, "enabled", e.target.checked)}
                    />
                    <input
                        type="number"
                        step="any"
                        class="tv-level-input"
                        value={lvl.value}
                        on:input={(e) => updateLevel(idx + 12, "value", parseFloat(e.target.value))}
                    />
                    <input
                        type="color"
                        class="tv-color-swatch-sm"
                        value={lvl.color}
                        on:input={(e) => updateLevel(idx + 12, "color", e.target.value)}
                    />
                </div>
            {/each}
        </div>
    </div>

    <!-- Background and Single Color Options -->
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
                    value={settings.backgroundOpacity != null ? settings.backgroundOpacity : 15}
                    on:input={(e) => update("backgroundOpacity", parseInt(e.target.value))}
                />
                <span class="tv-val-badge">{settings.backgroundOpacity != null ? settings.backgroundOpacity : 15}%</span>
            </div>
        </div>
    </div>
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
</style>
