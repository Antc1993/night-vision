<script>
    export let settings = {};
    export let onUpdate = () => {};

    if (!settings.upColor) settings.upColor = "#26a69a";
    if (!settings.downColor) settings.downColor = "#f23645";
    if (settings.backgroundOpacity == null) settings.backgroundOpacity = 18;
    if (!settings.lineWidth) settings.lineWidth = 1;

    function update(key, value) {
        settings[key] = value;
        onUpdate();
    }
</script>

<div class="tv-style-container">
    <div class="tv-field-row">
        <label for="nvjs-measure-up-color">Color al alza (positivo)</label>
        <input
            id="nvjs-measure-up-color"
            type="color"
            class="tv-color-swatch"
            value={settings.upColor || "#26a69a"}
            on:input={(e) => update("upColor", e.target.value)}
        />
    </div>

    <div class="tv-field-row">
        <label for="nvjs-measure-down-color">Color a la baja (negativo)</label>
        <input
            id="nvjs-measure-down-color"
            type="color"
            class="tv-color-swatch"
            value={settings.downColor || "#f23645"}
            on:input={(e) => update("downColor", e.target.value)}
        />
    </div>

    <div class="tv-field-row">
        <label for="nvjs-measure-width">Grosor de borde</label>
        <div class="tv-slider-box">
            <input
                id="nvjs-measure-width"
                type="range"
                min="1"
                max="6"
                step="1"
                class="tv-range"
                value={settings.lineWidth || 1}
                on:input={(e) => update("lineWidth", parseInt(e.target.value))}
            />
            <span class="tv-val-badge">{settings.lineWidth || 1}px</span>
        </div>
    </div>

    <div class="tv-field-row">
        <label for="nvjs-measure-opacity">Opacidad de fondo</label>
        <div class="tv-slider-box">
            <input
                id="nvjs-measure-opacity"
                type="range"
                min="0"
                max="100"
                step="5"
                class="tv-range"
                value={settings.backgroundOpacity != null ? settings.backgroundOpacity : 18}
                on:input={(e) => update("backgroundOpacity", parseInt(e.target.value))}
            />
            <span class="tv-val-badge">{settings.backgroundOpacity != null ? settings.backgroundOpacity : 18}%</span>
        </div>
    </div>
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
</style>
