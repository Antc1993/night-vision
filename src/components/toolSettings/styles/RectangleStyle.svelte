<script>
    export let settings = {};
    export let onUpdate = () => {};

    function update(key, value) {
        settings[key] = value;
        onUpdate();
    }
</script>

<div class="tv-style-container">
    <div class="tv-field-row">
        <label for="nvjs-rect-color">Color de línea</label>
        <input
            id="nvjs-rect-color"
            type="color"
            class="tv-color-swatch"
            value={settings.color || "#33ff33"}
            on:input={(e) => update("color", e.target.value)}
        />
    </div>

    <div class="tv-field-row">
        <label for="nvjs-rect-width">Grosor de línea</label>
        <div class="tv-slider-box">
            <input
                id="nvjs-rect-width"
                type="range"
                min="1"
                max="8"
                step="1"
                class="tv-range"
                value={settings.lineWidth || 1}
                on:input={(e) => update("lineWidth", parseInt(e.target.value))}
            />
            <span class="tv-val-badge">{settings.lineWidth || 1}px</span>
        </div>
    </div>

    <div class="tv-field-row">
        <label for="nvjs-rect-line-style">Estilo de línea</label>
        <select
            id="nvjs-rect-line-style"
            class="tv-select"
            value={settings.lineStyle || "solid"}
            on:change={(e) => update("lineStyle", e.target.value)}
        >
            <option value="solid">Sólida</option>
            <option value="dashed">Discontinua</option>
            <option value="dotted">Puntos</option>
        </select>
    </div>

    <div class="tv-field-row">
        <label class="tv-checkbox-inline">
            <input
                type="checkbox"
                checked={settings.showBackground !== false}
                on:change={(e) => update("showBackground", e.target.checked)}
            />
            <span>Fondo</span>
        </label>
        <input
            id="nvjs-fill-color"
            type="color"
            class="tv-color-swatch"
            value={settings.backColor || settings.fillColor || settings.color || "#33ff33"}
            on:input={(e) => {
                update("backColor", e.target.value);
                update("fillColor", e.target.value);
            }}
        />
    </div>

    {#if settings.showBackground !== false}
        <div class="tv-field-row">
            <label for="nvjs-rect-opacity">Opacidad de fondo</label>
            <div class="tv-slider-box">
                <input
                    id="nvjs-rect-opacity"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    class="tv-range"
                    value={settings.fillOpacity != null ? settings.fillOpacity : (settings.backgroundOpacity != null ? settings.backgroundOpacity : 20)}
                    on:input={(e) => {
                        const val = parseInt(e.target.value);
                        update("fillOpacity", val);
                        update("backgroundOpacity", val);
                    }}
                />
                <span class="tv-val-badge">{settings.fillOpacity != null ? settings.fillOpacity : (settings.backgroundOpacity != null ? settings.backgroundOpacity : 20)}%</span>
            </div>
        </div>
    {/if}
</div>

<style>
    .tv-style-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .tv-field-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
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

    .tv-checkbox-inline input {
        accent-color: #2962ff;
        cursor: pointer;
    }

    .tv-color-swatch {
        width: 32px;
        height: 28px;
        border: 1px solid #363c4e;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        padding: 0;
    }

    .tv-slider-box {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 160px;
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

    .tv-select {
        background: #1e222d;
        border: 1px solid #363c4e;
        color: #d1d4dc;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        outline: none;
        cursor: pointer;
    }

    .tv-select:hover {
        border-color: #4c525e;
    }
</style>
